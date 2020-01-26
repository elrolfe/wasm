import { Wasm } from "./constants";

export function encodeExportFunction(name, index) {
  return [...encodeString(name), Wasm.ImportExport.Function, ...encodeUInt(index)];
}

export function encodeFloat32(n) {
  const buffer = new ArrayBuffer(4);
  const floatArray = new Float32Array(buffer);

  floatArray[0] = n;

  return new Uint8Array(buffer);
}

export function encodeFloat64(n) {
  const buffer = new ArrayBuffer(8);
  const floatArray = new Float64Array(buffer);

  floatArray[0] = n;

  return new Uint8Array(buffer);
}

export function encodeFunctionSignature(argumentList, returnType) {
  return [
    0x60,
    ...(argumentList && argumentList.length > 0 ? encodeVector(argumentList) : [0x00]),
    ...(returnType && returnType.length > 0 ? encodeVector(returnType) : [0x00])
  ];
}

export function encodeInt(n) {
  const buffer = [];
  let more = true;

  while (more) {
    let byte = n & 0x7f;
    n >>>= 7;

    if ((n === 0 && (byte & 0x40) === 0) || (n === -1 && (byte & 0x40) !== 0)) more = false;
    else byte |= 0x80;

    buffer.push(byte);
  }

  return buffer;
}

export function encodeSection(section, data) {
  return [section, ...encodeVector(data)];
}

export function encodeString(str) {
  return [str.length, ...str.split("").map(c => c.charCodeAt(0))];
}

export function encodeUInt(n) {
  const buffer = [];

  do {
    const byte = n & 0x7f;
    n >>>= 7;
    buffer.push(n === 0 ? byte : byte | 0x80);
  } while (n !== 0);

  return buffer;
}

export function encodeVector(vector) {
  return [...encodeUInt(vector.length), ...vector.flat(Infinity)];
}
