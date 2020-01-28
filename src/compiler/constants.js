// Keywords
export const Keyword = Object.freeze(["constant", "export", "return"]);
export const VariableTypeKeyword = Object.freeze(["number"]);

// For debugging purposes, the Token and Type objects are mapped to strings
// In the future, this may be changed over to numerics
export const Token = Object.freeze({
  Assignment: "assignment",
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
  VariableTypeKeyword: "variableTypeKeyword",
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
    localGet: 0x20,
    localSet: 0x21,
    localTee: 0x22,
    globalGet: 0x23,
    globalSet: 0x24,
    i32: 0x41,
    i64: 0x42,
    f32: 0x43,
    f64: 0x44,
    f32Add: 0x92,
    f32Sub: 0x93,
    f32Mul: 0x94,
    f32Div: 0x95
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
    constant: 0x00,
    var: 0x01,
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
  ReturnStatement: "returnStatement",
  Variable: "variable",
  VariableAssignment: "variableAssignment",
  VariableDefinition: "variableDefinition"
});
