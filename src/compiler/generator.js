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

    ast.code.forEach(codeStatement => {
      if (codeStatement.type === Type.FunctionCall) {
        codeStatement.arguments.forEach(arg => {
          code.push(Wasm.OpCode.f32);
          code.push(...encodeFloat32(arg));
        });

        for (let i = 0; i < parseData.functionImports.length; i++) {
          const { module, identifier } = parseData.functionImports[i];
          if (codeStatement.module === module && codeStatement.identifier === identifier) {
            code.push(Wasm.OpCode.call);
            code.push(...encodeUInt(i));
            return;
          }
        }

        throw new GeneratorError(
          `No import found for ${codeStatement.module}.${codeStatement.identifier}`
        );
      }
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
