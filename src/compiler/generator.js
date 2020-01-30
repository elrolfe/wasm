import { Type, Wasm } from "./constants";
import {
  encodeExportFunction,
  encodeFloat32,
  encodeSection,
  encodeString,
  encodeVector,
  encodeUInt,
  typeToValue
} from "./encodings";

const booleanConstants = {
  false: 0,
  true: 1
};

let baseFunctionIndex;
let currentFunction;
let symbols;

function generateBooleanConstant(element) {
  if (booleanConstants.hasOwnProperty(element.value))
    return [Wasm.OpCode.i32, ...encodeUInt(booleanConstants[element.value])];

  throw new Error(`Unrecognized value: ${element.value}`);
}

function generateCode(element) {
  currentFunction = element.identifier;

  const code = generateCodeBlock(element.codeBlock);
  code.push(Wasm.OpCode.end);

  const locals = [];
  symbols.getAllLocals(currentFunction).forEach(l => {
    if (locals.length === 0 || locals[locals.length - 1].variableType !== l.variableType)
      locals.push({
        variableType: l.variableType,
        count: 1
      });
    else locals[locals.length - 1].count++;
  });

  return [
    ...(locals.length === 0
      ? [0x00]
      : encodeVector(locals.map(l => [l.count, typeToValue(l.variableType)]))),
    ...code
  ];
}

function generateCodeBlock(element) {
  return element.flatMap(statement => {
    switch (statement.elementType) {
      case Type.FunctionCall:
        return generateFunctionCall(statement);

      case Type.IfStatement:
        return generateIfStatement(statement);

      case Type.ImportFunctionCall:
        return generateImportFunctionCall(statement);

      case Type.ReturnStatement:
        return generateReturnStatement(statement);

      case Type.VariableDefinition:
        return generateVariableDefinition(statement);

      case Type.VariableAssignment:
        return generateVariableAssignment(statement);

      default:
        throw new Error(`Illegal statement type: ${statement.elementType}`);
    }
  });
}

function generateExpression(element) {
  return element.expression.flatMap(exp => {
    switch (exp.elementType) {
      case Type.BooleanConstant:
        return generateBooleanConstant(exp);

      case Type.BooleanOperator:
        switch (exp.operator) {
          case "&&": // And
            return [Wasm.OpCode.i32and];

          case "||": // Or
            return [Wasm.OpCode.i32or];

          case "!": // Negation
            return [Wasm.OpCode.i32eqz];

          default:
            throw new Error(`Unexpected operator: ${exp.operator}`);
        }

      case Type.ComparisonOperator:
        switch (exp.operator) {
          case "==": // Equals
            return [Wasm.OpCode.f32eq];

          case "!=": // Not Equals
            return [Wasm.OpCode.f32ne];

          case "<": // Less Than
            return [Wasm.OpCode.f32lt];

          case ">": // Greater Than
            return [Wasm.OpCode.f32gt];

          case "<=": // Less Than or Equal
            return [Wasm.OpCode.f32le];

          case ">=": // Greater Than or Equal
            return [Wasm.OpCode.f32ge];

          default:
            throw new Error(`Unexpected operator: ${exp.operator}`);
        }

      case Type.FunctionCall:
        return generateFunctionCall(exp);

      case Type.ImportFunctionCall:
        return generateImportFunctionCall(exp);

      case Type.NumericConstant:
        return [Wasm.OpCode.f32, ...encodeFloat32(exp.value)];

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
            throw new Error(`Unexpected operator: ${exp.operator}`);
        }

      case Type.Variable:
        const variable = symbols.getVariable(currentFunction, exp.block, exp.identifier);
        return [
          variable.scope === "global" ? Wasm.OpCode.globalGet : Wasm.OpCode.localGet,
          ...encodeUInt(variable.index)
        ];

      default:
        throw new Error(`Unexpected element in expression: ${exp.elementType}`);
    }
  });
}

function generateFunctionCall(element) {
  return [
    ...(element.arguments ? element.arguments.flatMap(a => generateExpression(a)) : []),
    Wasm.OpCode.call,
    ...encodeUInt(symbols.getFunction(element.identifier).index + baseFunctionIndex)
  ];
}

function generateIfStatement(element) {
  return [
    ...generateExpression(element),
    Wasm.OpCode.if,
    Wasm.ValueType.block,
    ...generateCodeBlock(element.codeBlock),
    ...(element.elseBlock ? [Wasm.OpCode.else, ...generateCodeBlock(element.elseBlock)] : []),
    Wasm.OpCode.end
  ];
}

function generateImportFunctionCall(element) {
  return [
    ...(element.arguments ? element.arguments.flatMap(a => generateExpression(a)) : []),
    Wasm.OpCode.call,
    ...encodeUInt(symbols.getImportFunction(element.nameSpace, element.identifier).index)
  ];
}

function generateReturnStatement(element) {
  if (element.expression) return generateExpression(element.expression);
}

function generateVariableAssignment(element) {
  const variable = symbols.getVariable(currentFunction, element.block, element.identifier);
  return [
    ...generateExpression(element.expression),
    variable.scope === "global" ? Wasm.OpCode.globalSet : Wasm.OpCode.localSet,
    ...encodeUInt(variable.index)
  ];
}

function generateVariableDefinition(element) {
  const variable = symbols.getVariable(currentFunction, element.block, element.identifier);
  return element.expression
    ? [
        ...generateExpression(element.expression),
        Wasm.OpCode.localSet,
        ...encodeUInt(variable.index)
      ]
    : [];
}

export function generate({ ast, symbolTable }) {
  symbols = symbolTable;
  baseFunctionIndex = symbols.importFunctions.length;

  // Type Section
  const typeSection = encodeSection(Wasm.Section.Type, encodeVector(symbols.functionSignatures));

  // Import Section
  const imports = [
    ...symbols.importFunctions.map(i => [
      ...encodeString(i.nameSpace),
      ...encodeString(i.identifier),
      Wasm.ImportExport.Function,
      i.signature
    ])
  ];

  const importSection =
    imports.length > 0 ? encodeSection(Wasm.Section.Import, encodeVector(imports)) : [];

  // Global Section
  currentFunction = null;
  const globalVariables = ast
    .filter(f => f.elementType === Type.VariableDefinition)
    .map(gv => [
      typeToValue(gv.variableType),
      gv.constant ? Wasm.ValueType.constant : Wasm.ValueType.var,
      ...(gv.expression ? generateExpression(gv.expression) : [0x00]),
      Wasm.OpCode.end
    ]);

  const globalSection =
    globalVariables.length > 0
      ? encodeSection(Wasm.Section.Global, encodeVector(globalVariables))
      : [];

  // Function, Export, and Code Sections
  const functionTypeIds = [];
  const exportFunctions = [];

  const codeBlocks = ast
    .filter(f => f.elementType === Type.FunctionDefinition)
    .map(element => {
      if (element.export)
        exportFunctions.push(
          encodeExportFunction(element.identifier, functionTypeIds.length + baseFunctionIndex)
        );

      functionTypeIds.push(...encodeUInt(symbols.getFunction(element.identifier).signature));
      return encodeVector(generateCode(element));
    });

  const functionSection =
    functionTypeIds.length > 0
      ? encodeSection(Wasm.Section.Function, encodeVector(functionTypeIds))
      : [];

  const exportSection =
    exportFunctions.length > 0
      ? encodeSection(Wasm.Section.Export, encodeVector(exportFunctions))
      : [];

  const codeSection =
    codeBlocks.length > 0 ? encodeSection(Wasm.Section.Code, encodeVector(codeBlocks)) : [];

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
