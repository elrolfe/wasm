import { Token, Type } from "./constants";
import { SymbolTable } from "./symbols";

let currentBlock, nextBlock;
let currentFunction;
let symbolTable;
let tokens;

export function parse(tokenList) {
  const ast = [];
  tokens = tokenList;

  symbolTable = new SymbolTable(tokens);
  symbolTable.addImportFunction("system", "output", [{ variableType: Type.NumberType }], null);

  // Gather all of the global variable and function symbols

  while (tokens.current()) {
    symbolParseProgramStatement();
  }

  tokens.reset();

  // Process the tokens
  while (tokens.current()) {
    ast.push(parseProgramStatement());
  }

  return { ast, symbolTable };
}

//
// Parsing Functions
//

function parseAssignment(variableType) {
  // Assignment ==> = Expression
  try {
    tokens.advance(Token.Assignment);
  } catch (err) {
    return null;
  }

  return parseExpression(variableType);
}

function parseBlockStatement() {
  // BlockStatement ==> FunctionCall ;
  //                  | VariableDefinition ;
  //                  | VariableAssignment ;
  //                  | return Expression ;
  //                  | if ( BooleanExpression ) CodeBlock ElseBlock
  //                  | while ( BooleanExpression ) CodeBlock
  let statement;

  switch (tokens.current().token) {
    case Token.Keyword:
      switch (tokens.current().lexeme) {
        case "do": // do CodeBlock while ( BooleanExpression ) ;
          tokens.advance();

          statement = {
            elementType: Type.WhileLoop,
            doWhile: true,
            codeBlock: parseCodeBlock(currentBlock)
          };

          tokens.advance(Token.Keyword, "while");
          tokens.advance(Token.LeftParen);

          statement.expression = parseBooleanExpression();

          tokens.advance(Token.RightParen);
          tokens.advance(Token.Semicolon);

          return statement;

        case "for": // for ( IDENTIFIER in NumericExpression .. NumericExpression StepValue ) CodeBlock
          tokens.advance();
          tokens.advance(Token.LeftParen);

          const lastBlock = currentBlock;
          currentBlock = nextBlock++;

          symbolTable.addLocalBlock(currentFunction, lastBlock);

          statement = {
            elementType: Type.ForLoop,
            variableType: Type.NumberType,
            identifier: parseIdentifier(),
            block: currentBlock
          };

          symbolTable.addLocalVariable(
            currentFunction,
            statement.block,
            statement.identifier,
            statement.variableType
          );

          tokens.advance(Token.Keyword, "in");

          statement.expression = { expression: parseNumericExpression() };

          tokens.advance(Token.RangeOp);

          statement.endExpression = { expression: parseNumericExpression() };
          statement.stepExpression = { expression: parseStepValue() };

          tokens.advance(Token.RightParen);

          statement.codeBlock = parseCodeBlock(currentBlock);

          currentBlock = lastBlock;
          return statement;

        case "if": // if ( BooleanExpression ) CodeBlock ElseBlock
          tokens.advance();
          tokens.advance(Token.LeftParen);

          statement = {
            elementType: Type.IfStatement,
            expression: parseBooleanExpression()
          };

          tokens.advance(Token.RightParen);

          statement.codeBlock = parseCodeBlock(currentBlock);
          statement.elseBlock = parseElseBlock();

          return statement;

        case "return": // return Expression ;
          tokens.advance();

          statement = {
            elementType: Type.ReturnStatement,
            expression: parseExpression(symbolTable.getFunction(currentFunction).returnType)
          };
          tokens.advance(Token.Semicolon);

          return statement;

        case "while": // while ( BooleanExpression ) CodeBlock
          tokens.advance();
          tokens.advance(Token.LeftParen);

          statement = {
            elementType: Type.WhileLoop,
            doWhile: false,
            expression: parseBooleanExpression()
          };

          tokens.advance(Token.RightParen);

          statement.codeBlock = parseCodeBlock(currentBlock);

          return statement;

        default:
          throw tokens.unexpected(Token.Keyword);
      }

    case Token.VariableTypeKeyword: // VariableDefinition ;
      statement = parseVariableDefinition();
      symbolTable.addLocalVariable(
        currentFunction,
        currentBlock,
        statement.identifier,
        statement.variableType
      );

      tokens.advance(Token.Semicolon);

      return statement;

    case Token.Identifier:
      switch (tokens.next().token) {
        case Token.LeftParen: // FunctionCall ;
        case Token.Period:
          statement = parseFunctionCall();
          tokens.advance(Token.Semicolon);

          return statement;

        case Token.Assignment: // VariableAssignment ;
          statement = parseVariableAssignment();
          tokens.advance(Token.Semicolon);

          return statement;

        default:
          throw tokens.unexpected();
      }

    default:
      throw tokens.unexpected();
  }
}

function parseBooleanExpression() {
  // BooleanExpression ==> BooleanTerm BooleanExpression'
  const expression = [...parseBooleanTerm()];

  // BooleanExpression' ==> || BooleanTerm BooleanExpression'
  //                     | null
  while (tokens.current().token === Token.BooleanOp && tokens.current().lexeme === "||") {
    tokens.advance();
    expression.push(...parseBooleanTerm());
    expression.push({
      elementType: Type.BooleanOperator,
      operator: "||"
    });
  }

  return expression;
}

function parseBooleanFactor() {
  // BooleanFactor ==> FunctionCall
  //                 | IDENTIFIER
  //                 | ComparisonExpression
  //                 | ( BooleanExpression )
  //                 | BOOLEAN_CONSTANT

  // Attempt to match the ComparisonExpression first, as it uses Numeric instead of Boolean types
  try {
    tokens.mark(); // Mark where we are in the tokens
    return parseComparisonExpression();
  } catch (err) {
    tokens.reset(); // Rollback to out mark to try for another boolean factor

    switch (tokens.current().token) {
      case Token.BooleanKeyword: // BOOLEAN_CONSTANT
        const constant = [
          {
            elementType: Type.BooleanConstant,
            value: tokens.current().lexeme
          }
        ];
        tokens.advance();
        return constant;

      case Token.Identifier:
        if (tokens.next().token === Token.LeftParen) {
          // Function Call
          return [parseFunctionCall(Type.BooleanType)];
        } else {
          // IDENTIFIER (Variable)
          const variable = symbolTable.getVariable(
            currentFunction,
            currentBlock,
            tokens.current().lexeme
          );
          if (variable.variableType !== Type.BooleanType)
            throw new Error(
              `[${tokens.current().line}:${tokens.current().column}] Expected variable type ${
                Type.BooleanType
              }, ${variable.identifier} is defined as ${variable.variableType}`
            );
          tokens.advance();

          return [
            { elementType: Type.Variable, block: currentBlock, identifier: variable.identifier }
          ];
        }

      case Token.LeftParen:
        tokens.advance();
        const expression = [...parseBooleanExpression()];
        tokens.advance(Token.RightParen);

        return expression;

      default:
        throw tokens.unexpected();
    }
  }
}

function parseBooleanNegation() {
  // BooleanNegation ==> NegationFlag BooleanFactor
  const negate = parseFlag(Token.NegationOp);
  const expression = [...parseBooleanFactor()];

  if (negate)
    expression.push({
      elementType: Type.BooleanOperator,
      operator: "!"
    });

  return expression;
}

function parseBooleanTerm() {
  // BooleanTerm ==> BooleanNegation BooleanTerm'
  const expression = [...parseBooleanNegation()];

  // BooleanTerm' ==> && BooleanNegation BooleanTerm'
  while (tokens.current().token === Token.BooleanOp && tokens.current().lexeme === "&&") {
    tokens.advance();
    expression.push(...parseBooleanNegation());
    expression.push({
      elementType: Type.BooleanOperator,
      operator: "&&"
    });
  }

  return expression;
}

function parseCodeBlock(parent) {
  // CodeBlock ==> { BlockStatement* }
  tokens.advance(Token.LeftBrace);

  const lastBlock = currentBlock;
  currentBlock = nextBlock++;

  symbolTable.addLocalBlock(currentFunction, parent);
  const blockStatements = [];

  while (tokens.current().token !== Token.RightBrace) {
    blockStatements.push(parseBlockStatement());
  }

  currentBlock = lastBlock;

  tokens.advance(Token.RightBrace);

  return blockStatements;
}

function parseComparisonExpression() {
  // ComparisonExpression ==> NumericExpression COMPARISON_OP NumericExpression
  const expression = [...parseNumericExpression()];
  const opToken = tokens.advance(Token.ComparisonOp);

  expression.push(...parseNumericExpression());
  expression.push({
    elementType: Type.ComparisonOperator,
    operator: opToken.lexeme
  });

  return expression;
}

function parseElseBlock() {
  // ElseBlock ==> else CodeBlock
  //             | null
  try {
    tokens.advance(Token.Keyword, "else");
  } catch (err) {
    return null;
  }

  return parseCodeBlock(currentBlock);
}

function parseExpression(expressionType) {
  // Expression ==> NumericExpression
  //              | BooleanExpression
  switch (expressionType) {
    case Type.BooleanType:
      return {
        elementType: Type.BooleanExpression,
        expression: parseBooleanExpression()
      };

    case Type.NumberType:
      return {
        elementType: Type.NumericExpression,
        expression: parseNumericExpression()
      };

    default:
      throw new Error(
        `[${tokens.current().line}:${
          tokens.current().column
        }] Unknown expression type ${expressionType}`
      );
  }
}

function parseFactor() {
  // Factor ==> FunctionCall
  //          | Identifier
  //          | ( NumericExpression )
  //          | Number
  switch (tokens.current().token) {
    case Token.Number: // Number
      return [
        {
          elementType: Type.NumericConstant,
          value: parseNumber()
        }
      ];

    case Token.Identifier:
      if (tokens.next().token === Token.LeftParen)
        // FunctionCall
        return [parseFunctionCall(Type.NumberType)];
      else {
        // Identifier
        const variable = symbolTable.getVariable(
          currentFunction,
          currentBlock,
          tokens.current().lexeme
        );
        if (variable.variableType !== Type.NumberType)
          throw new Error(
            `[${tokens.current().line}:${tokens.current().column}] Expected variable type ${
              Type.NumberType
            }, ${variable.identifier} is defined as ${variable.variableType}`
          );
        tokens.advance();

        return [
          { elementType: Type.Variable, block: currentBlock, identifier: variable.identifier }
        ];
      }

    case Token.LeftParen: // ( NumericExpression )
      tokens.advance();
      const expression = [...parseNumericExpression()];
      tokens.advance(Token.RightParen);

      return expression;

    default:
      throw tokens.unexpected();
  }
}

function parseFlag(token, lexeme = null) {
  try {
    tokens.advance(token, lexeme);
    return true;
  } catch (err) {
    return false;
  }
}

function parseFunctionCall(expectedType = null) {
  // FunctionCall ==> ModuleIdentifier Identifier ( ArgumentList )
  const functionCall = {
    nameSpace: parseNameSpace(),
    identifier: parseIdentifier()
  };

  const functionDefinition = functionCall.nameSpace
    ? symbolTable.getImportFunction(functionCall.nameSpace, functionCall.identifier)
    : symbolTable.getFunction(functionCall.identifier);

  if (expectedType && expectedType !== functionDefinition.returnType)
    throw new Error(
      `[${tokens.current().line}:${
        tokens.current().column
      }] Expected return type ${expectedType}, ${functionCall.identifier} returns ${
        functionDefinition.returnType
      }`
    );

  tokens.advance(Token.LeftParen);

  // ArgumentList ==> Expression ArgumentList'
  //                | null
  // ArgumentList' ==> , Expression ArgumentList'
  //                 | null
  functionCall.arguments = [];
  while (tokens.current().token !== Token.RightParen) {
    functionCall.arguments.push(
      parseExpression(functionDefinition.parameterList[functionCall.arguments.length].variableType)
    );
    if (tokens.current().token === Token.Comma) tokens.advance();
  }

  tokens.advance(Token.RightParen);

  functionCall.elementType = functionCall.nameSpace ? Type.ImportFunctionCall : Type.FunctionCall;

  return functionCall;
}

function parseFunctionDefinition() {
  //  FunctionDefinition ==> ExportFlag IDENTIFIER ( ParameterList ) ReturnType CodeBlock

  const definition = {
    elementType: Type.FunctionDefinition,
    export: parseFlag(Token.Keyword, "export"),
    identifier: parseIdentifier()
  };

  currentBlock = 0;
  nextBlock = 1;

  currentFunction = definition.identifier;

  symbolTable.addLocalBlock(currentFunction, -1);

  tokens.advance(Token.LeftParen);

  // ParameterList => Paramter ParameterList'
  // ParameterList' => , Parameter ParameterList'
  definition.parameterList = [];
  while (tokens.current().token !== Token.RightParen) {
    const parameter = parseParameter();
    symbolTable.addLocalVariable(
      currentFunction,
      currentBlock,
      parameter.identifier,
      parameter.variableType
    );
    definition.parameterList.push(parameter);
    if (tokens.current().token === Token.Comma) tokens.advance();
  }

  tokens.advance(Token.RightParen);

  definition.returnType = parseReturnType();

  definition.codeBlock = parseCodeBlock(currentBlock);

  return definition;
}

function parseGlobalVariableDefinition() {
  // GlobalVariableDefinition ==> ConstantFlag VariableDefinition
  return {
    constant: parseFlag(Token.Keyword, "constant"),
    ...parseVariableDefinition()
  };
}

function parseIdentifier() {
  // Identifier ==> [a-zA-Z_][a-zA-Z0-9_]*
  if (tokens.current().token !== Token.Identifier) throw tokens.unexpected(Token.Identifier);

  const identifier = tokens.current().lexeme;
  tokens.advance();

  return identifier;
}

function parseNameSpace() {
  // ModuleIdentifier ==> Identifier .
  if (tokens.current().token === Token.Identifier && tokens.next().token === Token.Period) {
    const identifier = parseIdentifier();
    tokens.advance(Token.Period);

    return identifier;
  }

  return null;
}

function parseNumber() {
  // Number ==> (\d+\.?\d*)|(\.\d+)
  if (tokens.current().token !== Token.Number) throw tokens.unexpected(Token.Number);

  const number = parseFloat(tokens.current().lexeme);
  tokens.advance();

  return number;
}

function parseNumericExpression() {
  // NumericExpression ==> Term NumericExpression'
  const expression = [...parseTerm()]; // Term

  // NumericExpression' ==> SumOp Term NumericExpression'
  while (tokens.current().token === Token.SumOp) {
    const operator = tokens.current().lexeme; // SumOp
    tokens.advance();
    expression.push(...parseTerm()); // Term
    expression.push({
      elementType: Type.NumericOperator,
      operator
    });
  }

  return expression;
}

function parseParameter() {
  // Parameter ==> VariableType Identifier
  return {
    variableType: parseVariableType(),
    identifier: parseIdentifier()
  };
}

function parseProgramStatement() {
  //  ProgramStatement ==> FunctionDefinition
  //                     | GlobalVariableDefinition ;

  const current = tokens.current();
  let statement = null;

  switch (current.token) {
    case Token.Keyword:
      switch (current.lexeme) {
        case "constant": // GlobalVariableDefinition ;
          statement = parseGlobalVariableDefinition();
          tokens.advance(Token.Semicolon);
          return statement;

        case "export": // FunctionDefinition
          return parseFunctionDefinition();

        default:
          throw tokens.unexpected();
      }

    case Token.Identifier: // FunctionDefinition
      return parseFunctionDefinition();

    case Token.VariableTypeKeyword: // GlobalVariableDefinition ;
      statement = parseGlobalVariableDefinition();
      tokens.advance(Token.Semicolon);
      return statement;

    default:
      // Unexpected token
      throw tokens.unexpected();
  }
}

function parseReturnType() {
  // ReturnType ==> : VariableType
  //              | null
  try {
    tokens.advance(Token.Colon);
  } catch (e) {
    return null;
  }

  return parseVariableType();
}

function parseSign() {
  // Sign ==> SignFlag Factor
  const sign = parseSignFlag();
  const expression = [...parseFactor()];

  if (sign === "-")
    expression.push({
      elementType: Type.NumericSign
    });

  return expression;
}

function parseSignFlag() {
  try {
    const token = tokens.advance(Token.SumOp);
    return token.lexeme;
  } catch (err) {
    return "+";
  }
}

function parseStepValue() {
  try {
    tokens.advance(Token.Keyword, "step");
  } catch (e) {
    return null;
  }

  return parseNumericExpression();
}

function parseTerm() {
  // Term ==> Sign Term'
  const expression = [...parseSign()]; // Factor

  // Term' ==> MultOp Sign Term'
  while (tokens.current().token === Token.MultOp) {
    const operator = tokens.current().lexeme; // MultOp
    tokens.advance();
    expression.push(...parseSign()); // Factor
    expression.push({
      elementType: Type.NumericOperator,
      operator
    });
  }

  return expression;
}

function parseVariableAssignment() {
  // VariableAssignment ==> Identifier = Expression
  const assignment = {
    elementType: Type.VariableAssignment,
    block: currentBlock,
    identifier: parseIdentifier()
  };

  const variable = symbolTable.getVariable(currentFunction, currentBlock, assignment.identifier);
  if (variable.scope === "global" && variable.constant)
    throw new Error(`Cannot assign new value to global constant ${variable.identifier}`);

  tokens.advance(Token.assignment);

  assignment.expression = parseExpression(variable.variableType);

  return assignment;
}

function parseVariableDefinition() {
  // VariableDefinition ==> Variable_Type Identifier
  const variable = {
    elementType: Type.VariableDefinition,
    block: currentBlock,
    variableType: parseVariableType(),
    identifier: parseIdentifier()
  };

  variable.expression = parseAssignment(variable.variableType);

  return variable;
}

function parseVariableType() {
  // Variable_Type ==> boolean
  //                 | number
  if (tokens.current().token !== Token.VariableTypeKeyword)
    throw tokens.unexpected(Token.VariableTypeKeyword);

  switch (tokens.current().lexeme) {
    case "boolean":
      tokens.advance();
      return Type.BooleanType;

    case "number":
      tokens.advance();
      return Type.NumberType;

    default:
      throw tokens.unexpected();
  }
}

//
// Symbol Parsing Statements
//

function symbolParseProgramStatement() {
  const current = tokens.current();

  switch (current.token) {
    case Token.Keyword:
      switch (current.lexeme) {
        case "constant": // global variable
          symbolParseGlobalVariable();
          return;

        case "export": // function
          symbolParseFunction();
          return;

        default:
          throw tokens.unexpected();
      }

    case Token.Identifier: // function
      symbolParseFunction();
      return;

    case Token.VariableTypeKeyword: // global variable
      symbolParseGlobalVariable();
      return;

    default:
      // Unexpected token
      throw tokens.unexpected();
  }
}

function symbolParseFunction() {
  parseFlag(Token.Keyword, "export");

  const identifier = parseIdentifier();

  tokens.advance(Token.LeftParen);

  const parameterList = [];
  while (tokens.current().token !== Token.RightParen) {
    parameterList.push(parseParameter());
    if (tokens.current().token === Token.Comma) tokens.advance();
  }

  tokens.advance(Token.RightParen);

  const returnType = parseReturnType();

  symbolTable.addFunction(identifier, parameterList, returnType);

  tokens.advance(Token.LeftBrace);
  let braceCount = 1;

  while (braceCount > 0) {
    switch (tokens.current().token) {
      case Token.LeftBrace:
        braceCount++;
        break;

      case Token.RightBrace:
        braceCount--;
        break;

      default:
        break;
    }

    tokens.advance();
  }
}

function symbolParseGlobalVariable() {
  const constant = parseFlag(Token.Keyword, "constant");
  const variableType = parseVariableType();
  const identifier = parseIdentifier();

  while (tokens.current().token !== Token.Semicolon) {
    tokens.advance();
  }

  symbolTable.addGlobalVariable(identifier, constant, variableType);

  tokens.advance(Token.Semicolon);
}
