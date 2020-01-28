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

  function addFunctionIndex(name, parameterList, returnType) {
    if (functionIndex[name] && functionIndex[name].index >= 0)
      throw new ParserError(`Function ${name} has multiple definitions`);

    functionIndex[name] = {
      index: Object.entries(functionIndex).filter(([_, value]) => value.index > -1).length,
      parameterList,
      returnType
    };
  }

  function addFunctionReference(name) {
    if (!functionIndex[name])
      functionIndex[name] = {
        index: -currentToken.line,
        parameterList: null,
        returnType: null
      };
  }

  function functionSignatureIndex(argumentList, returnType) {
    const signature = encodeFunctionSignature(argumentList, returnType);

    for (let i = 0; i < functionSignatures.length; i++) {
      if (arraysEqual(signature, functionSignatures[i])) {
        return i;
      }
    }

    functionSignatures.push(signature);
    return functionSignatures.length - 1;
  }

  function parseAssignment() {
    try {
      advance(Token.Assignment);
      return parseExpression();
    } catch (err) {
      return null;
    }
  }

  function parseBlockStatement() {
    if (currentToken.token === Token.Keyword) {
      switch (currentToken.lexeme) {
        case "return":
          advance();

          const statement = {
            type: Type.ReturnStatement,
            expression: parseExpression()
          };

          advance(Token.Semicolon);
          return statement;

        default:
          throw unexpectedToken(currentToken, Token.Keyword);
      }
    } else if (currentToken.token === Token.VariableTypeKeyword) {
      const statement = parseVariableDefinitionStatement(false);
      advance(Token.Semicolon);

      return statement;
    } else if (currentToken.token === Token.Identifier) {
      if (nextToken.token === Token.LeftParen || nextToken.token === Token.Period) {
        const statement = parseFunctionCall();
        advance(Token.Semicolon);

        return statement;
      } else if (nextToken.token === Token.Assignment) {
        const statement = parseVariableAssignment();
        advance(Token.Semicolon);

        return statement;
      }
    }

    throw unexpectedToken(currentToken);
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

  function parseConstantFlag() {
    try {
      advance(Token.Keyword, "constant");
      return true;
    } catch (err) {
      return false;
    }
  }

  function parseExportFlag() {
    try {
      advance(Token.Keyword, "export");
      return true;
    } catch (err) {
      return false;
    }
  }

  function parseExpression() {
    // Add checks for non-numeric expressions in the future

    return {
      type: Type.NumericExpression,
      expression: parseNumericExpression()
    };
  }

  function parseFactor() {
    if (currentToken.token === Token.Number)
      return [
        {
          type: Type.NumericConstant,
          value: parseNumber()
        }
      ];

    if (currentToken.token === Token.Identifier) {
      if (nextToken.token === Token.LeftParen) return [parseFunctionCall()];
      else {
        const lexeme = currentToken.lexeme;
        advance();

        return [
          {
            type: Type.Variable,
            identifier: lexeme
          }
        ];
      }
    }

    if (currentToken.token === Token.LeftParen) {
      advance();
      const expression = [...parseNumericExpression()];
      advance(Token.RightParen);

      return expression;
    }

    throw unexpectedToken(currentToken);
  }

  function parseFunction() {
    const func = {
      type: Type.Function,
      export: parseExportFlag(),
      identifier: parseIdentifier()
    };

    advance(Token.LeftParen);

    const parameterList = [];
    while (currentToken.token !== Token.RightParen) {
      parameterList.push(parseParameter());
      if (currentToken.token === Token.Comma) advance();
    }

    advance(Token.RightParen);

    const returnType = parseFunctionReturn();

    func.typeIndex = functionSignatureIndex(
      parameterList.map(p => p.type),
      returnType
    );
    func.code = parseCodeBlock();

    addFunctionIndex(func.identifier, parameterList, returnType);

    return func;
  }

  function parseFunctionCall() {
    const functionCall = {
      module: parseModuleIdentifier(),
      identifier: parseIdentifier(),
      arguments: []
    };

    functionCall.type = functionCall.module ? Type.ImportFunctionCall : Type.FunctionCall;

    if (functionCall.type === Type.FunctionCall) addFunctionReference(functionCall.identifier);

    advance(Token.LeftParen);

    while (currentToken.token !== Token.RightParen) {
      functionCall.arguments.push(parseExpression());
      if (currentToken.token === Token.Comma) advance();
    }

    advance(Token.RightParen);

    return functionCall;
  }

  function parseFunctionReturn() {
    try {
      advance(Token.Colon);
    } catch (e) {
      return [];
    }

    return [parseVariableType()];
  }

  function parseIdentifier() {
    if (currentToken.token !== Token.Identifier)
      throw unexpectedToken(currentToken, Token.Identifier);

    const identifier = currentToken.lexeme;
    advance();

    return identifier;
  }

  function parseModuleIdentifier() {
    if (currentToken.token === Token.Identifier && nextToken.token === Token.Period) {
      const identifier = parseIdentifier();
      advance(Token.Period);

      return identifier;
    }

    return null;
  }

  function parseNumber() {
    if (currentToken.token !== Token.Number) throw unexpectedToken(currentToken, Token.Number);

    const number = parseFloat(currentToken.lexeme);
    advance();

    return number;
  }

  function parseNumericExpression() {
    const expression = [...parseTerm()];

    while (currentToken.token === Token.SumOp) {
      const operator = currentToken.lexeme;
      advance();
      expression.push(...parseTerm());
      expression.push({
        type: Type.NumericOperator,
        operator
      });
    }

    return expression;
  }

  function parseParameter() {
    return {
      type: parseVariableType(),
      identifier: parseIdentifier()
    };
  }

  function parseProgramStatement() {
    if (currentToken.token === Token.Keyword) {
      if (currentToken.lexeme === "constant") {
        const statement = parseVariableDefinitionStatement(true);
        advance(Token.Semicolon);

        return statement;
      } else if (currentToken.lexeme === "export") {
        return parseFunction();
      }
    } else if (currentToken.token === Token.Identifier) {
      return parseFunction();
    } else if (currentToken.token === Token.VariableTypeKeyword) {
      const statement = parseVariableDefinitionStatement(true);
      advance(Token.Semicolon);

      return statement;
    }

    throw unexpectedToken(currentToken);
  }

  function parseTerm() {
    const expression = [...parseFactor()];

    while (currentToken.token === Token.MultOp) {
      const operator = currentToken.lexeme;
      advance();
      expression.push(...parseFactor());
      expression.push({
        type: Type.NumericOperator,
        operator
      });
    }

    return expression;
  }

  function parseVariableAssignment() {
    const assignment = {
      type: Type.VariableAssignment,
      identifier: parseIdentifier()
    };

    advance(Token.assignment);

    assignment.expression = parseExpression();

    return assignment;
  }

  function parseVariableDefinitionStatement(constant) {
    return {
      type: Type.VariableDefinition,
      constant: parseConstantFlag() && constant,
      variableType: parseVariableType(),
      identifier: parseIdentifier(),
      expression: parseAssignment()
    };
  }

  function parseVariableType() {
    if (currentToken.token !== Token.VariableTypeKeyword)
      throw unexpectedToken(currentToken, Token.VariableTypeKeyword);

    if (currentToken.lexeme === "number") {
      advance();
      return Type.NumberType;
    }

    throw unexpectedToken(currentToken);
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
    ast.push(parseProgramStatement());
  }

  const undefinedFunctions = Object.entries(functionIndex).filter(([_, value]) => value.index < 0);
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
