export class LexerError extends Error {
  constructor(message, index) {
    super(message);
    this.index = index;
  }
}

export class ParserError extends Error {
  constructor(message, token) {
    super(message);
    this.token = token;
  }
}

export class GeneratorError extends Error {}
