# Wasm Compiler

This is a React project to compile a custom language into a WebAssembly module. The project was inspired by Colin Eberhardt's [chasm](https://github.com/ColinEberhardt/chasm) project, and his [Build Your Own WebAssembly Compiler](https://youtu.be/OsGnMm59wb4) talk at [QCon San Fransisco 2019](http://bit.ly/38sivWf).

## Language Grammar

The following grammar has been implemented to this point:

|           Production |        |                                                                        |
| -------------------: | :----: | :--------------------------------------------------------------------- |
|            _Program_ |  ==>   | _Function_ _Program_                                                   |
|                      | &#124; | &#11401;                                                               |
|           _Function_ |  ==>   | _ExportFlag_ **_IDENTIFIER_** **(** **)** _FunctionReturn_ _CodeBlock_ |
|         _ExportFlag_ |  ==>   | **export**                                                             |
|                      | &#124; | &#11401;                                                               |
|     _FunctionReturn_ |  ==>   | **:** **_VARIABLE_TYPE_**                                              |
|                      | &#124; | &#11401;                                                               |
|          _CodeBlock_ |  ==>   | **{** _BlockStatement_\* **}**                                         |
|     _BlockStatement_ |  ==>   | _FunctionCall_ **;**                                                   |
|                      | &#124; | **return** _Expression_ **;**                                          |
|       _FunctionCall_ |  ==>   | _ModuleIdentifier_ **_IDENTIFIER_** **(** _ExpressionList_ **)**       |
|   _ModuleIdentifier_ |  ==>   | **_IDENTIFIER_ .**                                                     |
|                      | &#124; | &#11401;                                                               |
|     _ExpressionList_ |  ==>   | (_Expression_ (**,** _Expression_)\*)?                                 |
|         _Expression_ |  ==>   | _NumericExpression_                                                    |
|                      | &#124; | &#11401;                                                               |
|  _NumericExpression_ |  ==>   | _Term_ _NumericExpression'_                                            |
| _NumericExpression'_ |  ==>   | **_SUM_OP_** _Term_ _NumericExpression'_                               |
|                      | &#124; | &#11401;                                                               |
|               _Term_ |  ==>   | _Factor_ _Term'_                                                       |
|              _Term'_ |  ==>   | **_MULT_OP_** _Factor_ _Term'_                                         |
|             _Factor_ |  ==>   | _FunctionCall_                                                         |
|                      | &#124; | **(** _NumericExpression_ **)**                                        |
|                      | &#124; | **_NUMBER_**                                                           |
|     **_IDENTIFIER_** |  ==>   | **/[a-zA-Z\_][a-za-z0-9\_]\*/**                                        |
|         **_SUM_OP_** |  ==>   | **+ &#124; -**                                                         |
|        **_MULT_OP_** |  ==>   | **\* &#124; /**                                                        |
|         **_NUMBER_** |  ==>   | **(\\d+\\.?\\d\*)&#124;(\\.\\d+)**                                     |
|  **_VARIABLE_TYPE_** |  ==>   | **number**                                                             |

The tokenizer will match the following tokens:

- Colon
- Comment (This token will not be passed on to the parser)
- Identifier
- Keyword
- LeftBrace
- LeftParen
- MultOp
- Number
- Period
- RightBrace
- RightParen
- Semicolon
- SumOp
- VariableTypeKeyword
- Whitespace (This token will not be passed on to the parser)

Language Keywords:

- `export`
- `number`
- `return`

If a function is defined with the `export` keyword, it will available to be called from the module in a JavaScript program.

Function calls in the format **_IDENTIFIER_ ( ... )** are calls to other user defined functions in the script. Functions do not need to be defined in the script before the call to the function.

Function calls in the format **_IDENTIFIER_._IDENTIFIER_ ( ... )** are imported functions, with the first identifier being the import module, and the second identifier being the name of the function. The compiler will define default imports under the "system" module.

Currently, the only defined import is `system.output` which as per the current language grammar, expects a number as input. To successfully instantiate a compiled module, a proper import object must be provided during instantiation that will map a JavaScript function to the system.output import. For example the following object maps the `console.log` function to the `system.output` import:

```javascript
{
  system: {
    output: console.log; // Map console.log to the system.output import
  }
}
```

Comments will be filtered out by the tokenizer, and never seen by the parser. Comments can be either:

Multiline comments

```
/*
  This is a multiline comment
  and will be filtered out by
  the lexer
*/
```

or End of Line comments

```
// Everything from the beginning double slash
// to the end of the line is filtered out
```
