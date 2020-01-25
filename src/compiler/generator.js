import { Type, WasmFingerprint, WasmVersion } from "./constants";

export function generate(ast) {
  return Uint8Array.from([...WasmFingerprint, ...WasmVersion]);
}
