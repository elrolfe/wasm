import { Keyword, Token } from "./constants";
import { LexerError } from "./exceptions";

const getColumnNumber = (source, index) =>
  source.lastIndexOf("\n", index) === -1 ? index + 1 : index - source.lastIndexOf("\n", index);

const getLineNumber = (source, index) => source.substring(0, index).split("\n").length;

const TokenMatchers = [matchToken(new RegExp("\\s+"), Token.WHITESPACE)];

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
    const matches = TokenMatchers.map(m => m(source, index)).filter(f => f);
    if (matches.length === 0)
      throw new LexerError(
        `[${getLineNumber(source, index)}:${getColumnNumber(
          source,
          index
        )}] Unrecognized character: ${source[index]}`,
        index
      );

    if (matches[0].token !== Token.WHITESPACE) tokens.push({ ...matches[0] });
    index += matches[0].lexeme.length;
  }

  return tokens;
}
