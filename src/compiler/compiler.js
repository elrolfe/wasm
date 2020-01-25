import { tokenize } from "./lexer";
import { parse } from "./parser";
import { generate } from "./generator";

export function compile(source) {
  const tokens = tokenize(source);
  const ast = parse(tokens);
  return generate(ast);
}
