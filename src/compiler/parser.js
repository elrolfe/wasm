import { Token, Type } from "./constants";
import { ParserError } from "./exceptions";

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
  const ast = [];

  const tokenIterator = tokens[Symbol.iterator]();
  let currentToken = tokenIterator.next().value;
  let nextToken = tokenIterator.next().value;

  function advance(token, lexeme) {
    if (token && currentToken.token !== token) throw unexpectedToken(currentToken, token, lexeme);

    if (lexeme && currentToken.lexeme !== lexeme)
      throw unexpectedToken(currentToken, token, lexeme);

    currentToken = nextToken;
    nextToken = tokenIterator.next().value;
  }

  while (currentToken) {
    advance();
  }

  return ast;
}
