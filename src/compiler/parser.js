import { Token, Type, Wasm } from "./constants";
import { encodeFunctionSignature } from "./encodings";
import { ParserError } from "./exceptions";
import { arraysEqual } from "./utility";

function unexpectedToken(receivedToken, wantedToken, wantedLexeme) {
  const { line, column, token, lexeme } = receivedToken;

  if (!wantedToken)
    return new ParserError(
      `[${line}:${column}] Unexpected token: ${token} (${lexeme})`,
      receivedToken
    );

  const expected = `Wanted ${wantedToken}${wantedLexeme ? ` (${wantedLexeme})` : ""}`;
  const received = `received ${token} (${lexeme})`;

  return new ParserError(
    `[${line}:${column}] Unexpected token: ${expected}, ${received}`,
    receivedToken
  );
}

export function parse(tokens) {
  function advance(token, lexeme) {
    if (token && currentToken.token !== token) throw unexpectedToken(currentToken, token, lexeme);

    if (lexeme && currentToken.lexeme !== lexeme)
      throw unexpectedToken(currentToken, token, lexeme);

    currentToken = nextToken;
    nextToken = tokenIterator.next().value;
  }

  function addFunctionIndex(name) {
    functionIndex[name] = Object.entries(functionIndex).filter(([_, value]) => value > -1).length;
  }

  function checkFunctionIndex(name) {
    if (!functionIndex[name]) functionIndex[name] = -currentToken.line;
  }

  function functionSignatureIndex(argumentList, returnType) {
    const signature = encodeFunctionSignature(argumentList, returnType);

    for (let i = 0; i < functionSignatures.length; i++) {
      if (arraysEqual(signature, functionSignatures[0])) {
        return i;
      }
    }

    functionSignatures.push(signature);
    return functionSignatures.length - 1;
  }

  function parseBlockStatement() {
    const statement = parseFunctionCall();
    advance(Token.Semicolon);

    return statement;
  }

  function parseCodeBlock() {
    const blockStatements = [];
    advance(Token.LeftBrace);

    while (currentToken.token !== Token.RightBrace) {
      blockStatements.push(parseBlockStatement());
    }

    advance();

    return blockStatements;
  }

  function parseExportFlag() {
    try {
      advance(Token.Keyword, "export");
      return true;
    } catch (err) {
      return false;
    }
  }

  function parseFunction() {
    const func = {
      type: Type.Function,
      export: parseExportFlag(),
      identifier: parseIdentifier()
    };

    addFunctionIndex(func.identifier);

    advance(Token.LeftParen);

    const argumentList = null;

    advance(Token.RightParen);

    const returnType = parseReturnType();

    func.typeIndex = functionSignatureIndex(argumentList, returnType);
    func.code = parseCodeBlock();

    return func;
  }

  function parseFunctionCall() {
    const functionCall = {
      type: Type.FunctionCall,
      module: parseIdentifier()
    };

    advance(Token.Period);

    functionCall.identifier = parseIdentifier();

    if (!functionCall.module) checkFunctionIndex(functionCall.identifier);

    advance(Token.LeftParen);

    functionCall.arguments = [parseNumber()];

    advance(Token.RightParen);

    return functionCall;
  }

  function parseIdentifier() {
    if (currentToken.token !== Token.Identifier)
      throw unexpectedToken(currentToken, Token.Identifier);

    const identifier = currentToken.lexeme;
    advance();

    return identifier;
  }

  function parseNumber() {
    if (currentToken.token !== Token.Number) throw unexpectedToken(currentToken, Token.Number);

    const number = parseFloat(currentToken.lexeme);
    advance();

    return number;
  }

  function parseReturnType() {
    return null;
  }

  const functionSignatures = [];

  const functionImports = [
    {
      module: "system",
      identifier: "output",
      signature: functionSignatureIndex([Wasm.ValueType.f32], null)
    }
  ];

  const functionIndex = {};

  const ast = [];

  const tokenIterator = tokens[Symbol.iterator]();
  let currentToken = tokenIterator.next().value;
  let nextToken = tokenIterator.next().value;

  while (currentToken) {
    ast.push(parseFunction());
  }

  const undefinedFunctions = Object.entries(functionIndex).filter(([_, value]) => value === -1);
  if (undefinedFunctions.length > 0)
    throw new ParserError(
      `Undefined function ${undefinedFunctions[0][0]} called on line ${-undefinedFunctions[0][1]}`
    );

  return {
    functionIndex,
    functionSignatures,
    functionImports,
    ast
  };
}
