// Keywords
export const BooleanKeyword = Object.freeze(["true", "false"]);
export const Keyword = Object.freeze([
  "constant",
  "do",
  "else",
  "export",
  "for",
  "if",
  "in",
  "return",
  "step",
  "while"
]);
export const VariableTypeKeyword = Object.freeze(["boolean", "number"]);

// For debugging purposes, the Token and Type objects are mapped to strings
// In the future, this may be changed over to numerics
export const Token = Object.freeze({
  Assignment: "assignment",
  BooleanKeyword: "booleanKeyword",
  BooleanOp: "booleanOp",
  Colon: "colon",
  Comment: "comment",
  ComparisonOp: "comparisonOp",
  Identifier: "identifier",
  Keyword: "keyword",
  LeftBrace: "leftBrace",
  LeftParen: "leftParen",
  MultOp: "multOp",
  NegationOp: "negationOp",
  Number: "number",
  Period: "period",
  RangeOp: "..",
  RightBrace: "rightBrace",
  RightParen: "rightParen",
  Semicolon: "semicolon",
  SumOp: "sumOp",
  VariableTypeKeyword: "variableTypeKeyword",
  Whitespace: "whitespace"
});

export const Type = Object.freeze({
  BooleanConstant: "booleanConstant",
  BooleanExpression: "booleanExpression",
  BooleanOperator: "booleanOperator",
  BooleanType: "booleanType",
  ComparisonOperator: "comparisonOperator",
  ForLoop: "forLoop",
  FunctionDefinition: "functionDefinition",
  FunctionCall: "functionCall",
  IfStatement: "ifStatement",
  ImportFunctionCall: "importFunctionCall",
  NumberType: "numberType",
  NumericConstant: "numericConstant",
  NumericExpression: "numericExpression",
  NumericOperator: "numericOperator",
  NumericSign: "numericSign",
  ReturnStatement: "returnStatement",
  Variable: "variable",
  VariableAssignment: "variableAssignment",
  VariableDefinition: "variableDefinition",
  WhileLoop: "whileLoop"
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
    block: 0x02,
    loop: 0x03,
    if: 0x04,
    else: 0x05,
    end: 0x0b,
    br: 0x0c,
    brIf: 0x0d,
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
    i32eqz: 0x45,
    f32eq: 0x5b,
    f32ne: 0x5c,
    f32lt: 0x5d,
    f32gt: 0x5e,
    f32le: 0x5f,
    f32ge: 0x60,
    i32and: 0x71,
    i32or: 0x72,
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
    block: 0x40,
    i32: 0x7f,
    i64: 0x7e,
    f32: 0x7d,
    f64: 0x7c
  },
  Version: [0x01, 0x00, 0x00, 0x00]
});
