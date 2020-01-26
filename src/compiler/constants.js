// Keywords
export const Keyword = Object.freeze(["export", "return"]);
export const VariableTypeKeyword = Object.freeze(["number"]);

// For debugging purposes, the Token and Type objects are mapped to strings
// In the future, this may be changed over to numerics
export const Token = Object.freeze({
  Colon: "colon",
  Comment: "comment",
  Identifier: "identifier",
  Keyword: "keyword",
  LeftBrace: "leftBrace",
  LeftParen: "leftParen",
  MultOp: "multOp",
  Number: "number",
  Period: "period",
  RightBrace: "rightBrace",
  RightParen: "rightParen",
  Semicolon: "semicolon",
  SumOp: "sumOp",
  Whitespace: "whitespace"
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
    return: 0x0f,
    i32: 0x41,
    i64: 0x42,
    f32: 0x43,
    f64: 0x44,
    f32_add: 0x92,
    f32_sub: 0x93,
    f32_mul: 0x94,
    f32_div: 0x95
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

export const Type = Object.freeze({
  Function: "function",
  FunctionCall: "functionCall",
  ImportFunctionCall: "importFunctionCall",
  NumberType: Wasm.ValueType.f32,
  NumericExpression: "numericExpression",
  NumericConstant: "numericConstant",
  NumericOperator: "numericOperator",
  ReturnStatement: "returnStatement"
});
