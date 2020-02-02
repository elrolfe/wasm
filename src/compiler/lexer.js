import { BooleanKeyword, Keyword, Token, VariableTypeKeyword } from "./constants";

class TokenList {
  constructor() {
    this.tokens = [];
    this.marker = 0;
    this.currentIndex = 0;
  }

  add(token) {
    this.tokens.push(token);
  }

  advance(token = null, lexeme = null) {
    const current = this.tokens[this.currentIndex];
    if (token && current.token !== token) {
      throw this.unexpected(token, lexeme);
    }

    if (lexeme && current.lexeme !== lexeme) {
      throw this.unexpected(token, lexeme);
    }

    this.currentIndex++;
    return current;
  }

  current() {
    return this.currentIndex >= this.tokens.length ? null : this.tokens[this.currentIndex];
  }

  mark() {
    this.marker = this.currentIndex;
  }

  next(offset = 1) {
    return this.currentIndex + offset >= this.tokens.length
      ? null
      : this.tokens[this.currentIndex + offset];
  }

  reset() {
    this.currentIndex = this.marker;
  }

  unexpected(token = null, lexeme = null) {
    const current = this.tokens[this.currentIndex];
    let message = `[${current.line}:${current.column}] Unexpected token - `;
    if (token) message += `wanted ${token}${lexeme ? ` (${lexeme})` : ""}, `;
    message += `got ${current.token} (${current.lexeme})`;

    return new Error(message);
  }
}

const TokenMatchers = [
  matchToken(new RegExp(`^(${BooleanKeyword.join("|")})\\b`), Token.BooleanKeyword),
  matchToken(new RegExp(`^(${Keyword.join("|")})\\b`), Token.Keyword),
  matchToken(new RegExp(`^(${VariableTypeKeyword.join("|")})\\b`), Token.VariableTypeKeyword),
  matchToken(new RegExp("^[a-zA-Z_][a-zA-Z0-9_]*"), Token.Identifier),
  matchToken(new RegExp("^(\\d+\\.?\\d*|\\.\\d+)"), Token.Number),
  matchToken(new RegExp("^\\/\\/.*"), Token.Comment),
  matchToken(new RegExp("^\\/\\*[^]*\\*\\/"), Token.Comment),
  matchToken(new RegExp("^(&&|\\|\\|)"), Token.BooleanOp),
  matchToken(new RegExp("^(==|!=|(>|<)=?)"), Token.ComparisonOp),
  matchToken(new RegExp("^(\\*|/)"), Token.MultOp),
  matchToken(new RegExp("^(\\+|-)"), Token.SumOp),
  matchToken(new RegExp("^\\.\\."), Token.RangeOp),
  matchToken(new RegExp("^="), Token.Assignment),
  matchToken(new RegExp("^!"), Token.NegationOp),
  matchToken(new RegExp("^\\{"), Token.LeftBrace),
  matchToken(new RegExp("^\\("), Token.LeftParen),
  matchToken(new RegExp("^\\."), Token.Period),
  matchToken(new RegExp("^\\}"), Token.RightBrace),
  matchToken(new RegExp("^\\)"), Token.RightParen),
  matchToken(new RegExp("^,"), Token.Comma),
  matchToken(new RegExp("^:"), Token.Colon),
  matchToken(new RegExp("^;"), Token.Semicolon),
  matchToken(new RegExp("^\\s+"), Token.Whitespace)
];

function matchToken(regex, token) {
  return (source, index) => {
    const match = source.substring(index).match(regex);
    return (
      match && {
        lexeme: match[0],
        token,
        line: tokenPosition(source, index).line,
        column: tokenPosition(source, index).column
      }
    );
  };
}

function tokenPosition(source, index) {
  return {
    line: source.substring(0, index).split("\n").length,
    column: index - source.lastIndexOf("\n", index)
  };
}

export function tokenize(source) {
  const tokens = new TokenList();
  let index = 0;

  while (index < source.length) {
    // eslint-disable-next-line no-loop-func
    const matches = TokenMatchers.map(m => m(source, index)).filter(f => f);
    if (matches.length === 0)
      throw new Error(
        `[${tokenPosition(source, index).line}:${
          tokenPosition(source, index).column
        }] Unrecognized character: ${source[index]}`
      );

    if (matches[0].token !== Token.Whitespace && matches[0].token !== Token.Comment)
      tokens.add(matches[0]);
    index += matches[0].lexeme.length;
  }

  return tokens;
}
