import { tokenize } from "./lexer";
import { parse } from "./parser";
import { generate } from "./generator";

export function compile(source) {
  const tokens = tokenize(source);
  const parseData = parse(tokens);
  // console.log(parseData);
  return generate(parseData);
}
