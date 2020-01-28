import { Type, Wasm } from "./constants";
import {
  encodeExportFunction,
  encodeFloat32,
  encodeSection,
  encodeString,
  encodeVector,
  encodeUInt
} from "./encodings";
import { GeneratorError } from "./exceptions";

export function generate(parseData) {
  function findVariableLocation(variable) {
    // Check parameters first
    for (let i = 0; i < parameterList.length; i++) {
      if (variable === parameterList[i].identifier)
        return {
          scope: "local",
          index: i
        };
    }

    // Check local variables
    for (let i = 0; i < localList.length; i++) {
      if (variable === localList[i].identifier)
        return {
          scope: "local",
          index: i + parameterList.length
        };
    }

    // Check global variables
    for (let i = 0; i < globalList.length; i++) {
      if (variable === globalList[i].identifier)
        return {
          scope: "global",
          index: i
        };
    }

    throw new GeneratorError(`Variable ${variable} has not been defined`);
  }

  function generateExpression(element) {
    return element.expression.flatMap(exp => {
      switch (exp.type) {
        case Type.NumericConstant:
          return [Wasm.OpCode.f32, ...encodeFloat32(exp.value)];

        case Type.FunctionCall:
          return generateFunctionCall(exp);

        case Type.ImportFunctionCall:
          return generateImportFunctionCall(exp);

        case Type.NumericOperator:
          switch (exp.operator) {
            case "+":
              return [Wasm.OpCode.f32Add];

            case "-":
              return [Wasm.OpCode.f32Sub];

            case "*":
              return [Wasm.OpCode.f32Mul];

            case "/":
              return [Wasm.OpCode.f32Div];

            default:
              throw new GeneratorError(`Unexpected operator: ${exp.operator}`);
          }

        case Type.Variable:
          const location = findVariableLocation(exp.identifier);
          return [
            location.scope === "local" ? Wasm.OpCode.localGet : Wasm.OpCode.globalGet,
            ...encodeUInt(location.index)
          ];

        default:
          throw new GeneratorError(`Unexpected element in expression: ${exp.type}`);
      }
    });
  }

  function generateFunctionCall(element) {
    const callCode = [];
    if (element.arguments)
      callCode.push(...element.arguments.flatMap(arg => generateExpression(arg)));

    callCode.push(
      Wasm.OpCode.call,
      ...encodeUInt(parseData.functionIndex[element.identifier].index + baseFunctionIndex)
    );

    return callCode;
  }

  function generateImportFunctionCall(element) {
    const callCode = [];
    if (element.arguments)
      callCode.push(...element.arguments.flatMap(arg => generateExpression(arg)));

    for (let i = 0; i < parseData.functionImports.length; i++) {
      const { module, identifier } = parseData.functionImports[i];
      if (element.module === module && element.identifier === identifier) {
        callCode.push(Wasm.OpCode.call);
        callCode.push(...encodeUInt(i));
        return callCode;
      }
    }

    throw new GeneratorError(`No import found for ${element.module}.${element.identifier}`);
  }

  function generateReturnStatement(element) {
    if (element.expression) return generateExpression(element.expression);
  }

  function generateCode(ast) {
    const astCode = [];
    const localOffset = parameterList.length;

    localList = [];

    ast.code.forEach(codeStatement => {
      if (codeStatement.type === Type.FunctionCall)
        astCode.push(...generateFunctionCall(codeStatement));
      else if (codeStatement.type === Type.ImportFunctionCall)
        astCode.push(...generateImportFunctionCall(codeStatement));
      else if (codeStatement.type === Type.ReturnStatement)
        astCode.push(...generateReturnStatement(codeStatement));
      else if (codeStatement.type === Type.VariableDefinition) {
        // Make sure the variable isn't already defined as a parameter
        parameterList.forEach(p => {
          if (p.identifier === codeStatement.identifier)
            throw new GeneratorError(
              `Variable identifier ${p.identifier} is already defined as a paramter`
            );
        });

        if (codeStatement.expression) {
          astCode.push(...generateExpression(codeStatement.expression));
          astCode.push(Wasm.OpCode.localSet, ...encodeUInt(localList.length + localOffset));
        }

        localList.push(codeStatement);
      } else if (codeStatement.type === Type.VariableAssignment) {
        const location = findVariableLocation(codeStatement.identifier);

        if (location.scope === "global" && globalList[location.index].constant)
          throw new GeneratorError(
            `Cannot assign new value to global constant ${codeStatement.identifier}`
          );

        astCode.push(...generateExpression(codeStatement.expression));
        astCode.push(
          location.scope === "global" ? Wasm.OpCode.globalSet : Wasm.OpCode.localSet,
          ...encodeUInt(location.index)
        );
      } else {
        throw new GeneratorError(`Illegal statement type: ${codeStatement.type}`);
      }
    });

    astCode.push(Wasm.OpCode.end);

    const locals = [];
    localList.forEach(l => {
      if (locals.length === 0 || locals[locals.length - 1].type !== l.variableType)
        locals.push({
          type: l.variableType,
          count: 1
        });
      else locals[locals.length - 1].count += 1;
    });

    return [
      ...(locals.length === 0 ? [0x00] : encodeVector(locals.map(l => [l.count, l.type]))),
      ...astCode
    ];
  }

  const baseFunctionIndex = parseData.functionImports.length;

  const typeSection = encodeSection(Wasm.Section.Type, encodeVector(parseData.functionSignatures));

  const importSection = encodeSection(
    Wasm.Section.Import,
    encodeVector([
      ...parseData.functionImports.map(i => [
        ...encodeString(i.module),
        ...encodeString(i.identifier),
        Wasm.ImportExport.Function,
        i.typeIndex
      ])
    ])
  );

  let parameterList;
  let localList;
  const functionTypeIds = [];
  const exportFunctions = [];
  const codeBlocks = [];

  const globalList = parseData.ast.filter(f => f.type === Type.VariableDefinition);
  const globalSection = encodeSection(
    Wasm.Section.Global,
    encodeVector(
      globalList.map(gl => {
        const temp = [];
        temp.push(gl.variableType);
        temp.push(gl.constant ? Wasm.ValueType.constant : Wasm.ValueType.var);
        temp.push(...(gl.expression ? generateExpression(gl.expression) : [0x00]));
        temp.push(Wasm.OpCode.end);
        return temp;
      })
    )
  );

  parseData.ast
    .filter(f => f.type === Type.Function)
    .forEach(ast => {
      if (ast.export)
        exportFunctions.push(
          encodeExportFunction(ast.identifier, functionTypeIds.length + baseFunctionIndex)
        );

      functionTypeIds.push(...encodeUInt(ast.typeIndex));

      parameterList = parseData.functionIndex[ast.identifier].parameterList;
      codeBlocks.push(encodeVector(generateCode(ast)));
    });

  const functionSection = encodeSection(Wasm.Section.Function, encodeVector(functionTypeIds));
  const exportSection = encodeSection(Wasm.Section.Export, encodeVector(exportFunctions));
  const codeSection = encodeSection(Wasm.Section.Code, encodeVector(codeBlocks));

  return Uint8Array.from([
    ...Wasm.Fingerprint,
    ...Wasm.Version,
    ...typeSection,
    ...importSection,
    ...functionSection,
    ...globalSection,
    ...exportSection,
    ...codeSection
  ]);
}
