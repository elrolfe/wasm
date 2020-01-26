export const Keyword = Object.freeze(["export"]);

// For debugging purposes, the Token and Type objects are mapped to strings
// In the future, this may be changed over to numerics
export const Token = Object.freeze({
  Identifier: "identifier",
  Keyword: "keyword",
  LeftBrace: "leftBrace",
  LeftParen: "leftParen",
  Number: "number",
  Period: "period",
  RightBrace: "rightBrace",
  RightParen: "rightParen",
  Semicolon: "semicolon",
  Whitespace: "whitespace"
});

export const Type = Object.freeze({
  Function: "function",
  FunctionCall: "functionCall"
});

export const Wasm = Object.freeze({
  EmptyList: [0x00],
  Fingerprint: [0x00, 0x61, 0x73, 0x6d],
  ImportExport: {
    Function: 0x00,
    Table: 0x01,
    Memory: 0x02,
    Global: 0x03
  },
  OpCode: {
    end: 0x0b,
    call: 0x10,
    i32: 0x41,
    i64: 0x42,
    f32: 0x43,
    f64: 0x44
  },
  Section: {
    Custom: 0x00,
    Type: 0x01,
    Import: 0x02,
    Function: 0x03,
    Table: 0x04,
    Memory: 0x05,
    Global: 0x06,
    Export: 0x07,
    Start: 0x08,
    Element: 0x09,
    Code: 0x0a,
    Data: 0x0b
  },
  ValueType: {
    i32: 0x7f,
    i64: 0x7e,
    f32: 0x7d,
    f64: 0x7c
  },
  Version: [0x01, 0x00, 0x00, 0x00]
});
