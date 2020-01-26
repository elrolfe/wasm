import { Keyword, Token, VariableTypeKeyword } from "./constants";
import { LexerError } from "./exceptions";

const getColumnNumber = (source, index) =>
  source.lastIndexOf("\n", index) === -1 ? index + 1 : index - source.lastIndexOf("\n", index);

const getLineNumber = (source, index) => source.substring(0, index).split("\n").length;

const TokenMatchers = [
  matchToken(new RegExp(`^(${Keyword.join("|")})\\b`), Token.Keyword),
  matchToken(new RegExp(`^(${VariableTypeKeyword.join("|")})\\b`), Token.VariableTypeKeyword),
  matchToken(new RegExp("^[a-zA-Z_][a-zA-Z0-9_]*"), Token.Identifier),
  matchToken(new RegExp("^(\\d+\\.?\\d*|\\.\\d+)"), Token.Number),
  matchToken(new RegExp("^\\{"), Token.LeftBrace),
  matchToken(new RegExp("^\\("), Token.LeftParen),
  matchToken(new RegExp("^\\."), Token.Period),
  matchToken(new RegExp("^\\}"), Token.RightBrace),
  matchToken(new RegExp("^\\)"), Token.RightParen),
  matchToken(new RegExp("^\\/\\/.*"), Token.Comment),
  matchToken(new RegExp("^\\/\\*[^]*\\*\\/"), Token.Comment),
  matchToken(new RegExp("^(\\*|/)"), Token.MultOp),
  matchToken(new RegExp("^(\\+|-)"), Token.SumOp),
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
        line: getLineNumber(source, index),
        column: getColumnNumber(source, index)
      }
    );
  };
}

export function tokenize(source) {
  const tokens = [];
  let index = 0;

  while (index < source.length) {
    // eslint-disable-next-line no-loop-func
    const matches = TokenMatchers.map(m => m(source, index)).filter(f => f);
    if (matches.length === 0)
      throw new LexerError(
        `[${getLineNumber(source, index)}:${getColumnNumber(
          source,
          index
        )}] Unrecognized character: ${source[index]}`,
        index
      );

    if (matches[0].token !== Token.Whitespace && matches[0].token !== Token.Comment)
      tokens.push({ ...matches[0] });
    index += matches[0].lexeme.length;
  }

  return tokens;
}
