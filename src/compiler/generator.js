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
  function generateCode(ast) {
    const code = [];
    const locals = [];

    function generateExpression(element) {
      element.expression.forEach(exp => {
        switch (exp.type) {
          case Type.NumericConstant:
            code.push(Wasm.OpCode.f32, ...encodeFloat32(exp.value));
            break;

          case Type.FunctionCall:
            generateFunctionCall(exp);
            break;

          case Type.ImportFunctionCall:
            generateImportFunctionCall(exp);
            break;

          case Type.NumericOperator:
            switch (exp.operator) {
              case "+":
                code.push(Wasm.OpCode.f32_add);
                break;

              case "-":
                code.push(Wasm.OpCode.f32_sub);
                break;

              case "*":
                code.push(Wasm.OpCode.f32_mul);
                break;

              case "/":
                code.push(Wasm.OpCode.f32_div);
                break;

              default:
                throw new GeneratorError(`Unexpected operator: ${exp.operator}`);
            }
            break;

          default:
            throw new GeneratorError(`Unexpected element in expression: ${exp.type}`);
        }
      });
    }

    function generateFunctionCall(element) {
      if (element.arguments) element.arguments.forEach(arg => generateExpression(arg));

      code.push(Wasm.OpCode.call);
      code.push(
        ...encodeUInt(parseData.functionIndex[element.identifier].index + baseFunctionIndex)
      );
    }

    function generateImportFunctionCall(element) {
      if (element.arguments) element.arguments.forEach(arg => generateExpression(arg));

      for (let i = 0; i < parseData.functionImports.length; i++) {
        const { module, identifier } = parseData.functionImports[i];
        if (element.module === module && element.identifier === identifier) {
          code.push(Wasm.OpCode.call);
          code.push(...encodeUInt(i));
          return;
        }
      }

      throw new GeneratorError(`No import found for ${element.module}.${element.identifier}`);
    }

    function generateReturnStatement(element) {
      if (element.expression) generateExpression(element.expression);
    }

    ast.code.forEach(codeStatement => {
      if (codeStatement.type === Type.FunctionCall) generateFunctionCall(codeStatement);
      else if (codeStatement.type === Type.ImportFunctionCall)
        generateImportFunctionCall(codeStatement);
      else if (codeStatement.type === Type.ReturnStatement) generateReturnStatement(codeStatement);
    });

    code.push(Wasm.OpCode.end);

    return [...(locals.length === 0 ? [0x00] : locals), ...code];
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

  const functionTypeIds = [];
  const exportFunctions = [];
  const code = [];

  parseData.ast.forEach(ast => {
    if (ast.export)
      exportFunctions.push(
        encodeExportFunction(ast.identifier, functionTypeIds.length + baseFunctionIndex)
      );

    functionTypeIds.push(...encodeUInt(ast.typeIndex));

    code.push(encodeVector(generateCode(ast)));
  });

  const functionSection = encodeSection(Wasm.Section.Function, encodeVector(functionTypeIds));
  const exportSection = encodeSection(Wasm.Section.Export, encodeVector(exportFunctions));
  const codeSection = encodeSection(Wasm.Section.Code, encodeVector(code));

  return Uint8Array.from([
    ...Wasm.Fingerprint,
    ...Wasm.Version,
    ...typeSection,
    ...importSection,
    ...functionSection,
    ...exportSection,
    ...codeSection
  ]);
}
