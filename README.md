# Wasm Compiler

This is a React project to compile a custom language into a WebAssembly module. The project was inspired by Colin Eberhardt's [chasm](https://github.com/ColinEberhardt/chasm) project, and his [Build Your Own WebAssembly Compiler](https://youtu.be/OsGnMm59wb4) talk at [QCon San Fransisco 2019](http://bit.ly/38sivWf).

## Language Grammar

The following grammar has been implemented to this point:

|           Production |        |                                                                                        |
| -------------------: | :----: | :------------------------------------------------------------------------------------- |
|            _Program_ |  ==>   | _ProgramStatement_ _Program_                                                           |
|                      | &#124; | &#11401;                                                                               |
|   _ProgramStatement_ |  ==>   | _Function_                                                                             |
|                      | &#124; | _VariableDefinition_ **;**                                                             |
|           _Function_ |  ==>   | _ExportFlag_ **_IDENTIFIER_** **(** _ParameterList_ **)** _FunctionReturn_ _CodeBlock_ |
|         _ExportFlag_ |  ==>   | **export**                                                                             |
|                      | &#124; | &#11401;                                                                               |
|      _ParameterList_ |  ==>   | _Parameter_ _ParameterList'_                                                           |
|                      | &#124; | &#11401;                                                                               |
|     _ParameterList'_ |  ==>   | **,** _Parameter_ _ParameterList'_                                                     |
|          _Parameter_ |  ==>   | **_VARIABLE_TYPE_** **_IDENTIFIER_**                                                   |
|     _FunctionReturn_ |  ==>   | **:** **_VARIABLE_TYPE_**                                                              |
|                      | &#124; | &#11401;                                                                               |
|          _CodeBlock_ |  ==>   | **{** _BlockStatement_\* **}**                                                         |
|     _BlockStatement_ |  ==>   | _FunctionCall_ **;**                                                                   |
|                      | &#124; | _VariableDefinition_ **;**                                                             |
|                      | &#124; | _VariableAssignment_ **;**                                                             |
|                      | &#124; | **return** _Expression_ **;**                                                          |
|       _FunctionCall_ |  ==>   | _ModuleIdentifier_ **_IDENTIFIER_** **(** _ArgumentList_ **)**                         |
|   _ModuleIdentifier_ |  ==>   | **_IDENTIFIER_ .**                                                                     |
|                      | &#124; | &#11401;                                                                               |
|       _ArgumentList_ |  ==>   | _Expression_ _ArgumentList'_                                                           |
|                      | &#124; | &#11401;                                                                               |
|      _ArgumentList'_ |  ==>   | **,** _Expression_ _ArgumentList'_                                                     |
|                      | &#124; | &#11401;                                                                               |
|         _Expression_ |  ==>   | _NumericExpression_                                                                    |
|  _NumericExpression_ |  ==>   | _Term_ _NumericExpression'_                                                            |
| _NumericExpression'_ |  ==>   | **_SUM_OP_** _Term_ _NumericExpression'_                                               |
|                      | &#124; | &#11401;                                                                               |
|               _Term_ |  ==>   | _Factor_ _Term'_                                                                       |
|              _Term'_ |  ==>   | **_MULT_OP_** _Factor_ _Term'_                                                         |
|                      | &#124; | &#11401;                                                                               |
|             _Factor_ |  ==>   | _FunctionCall_                                                                         |
|                      | &#124; | **_IDENTIFIER_**                                                                       |
|                      | &#124; | **(** _NumericExpression_ **)**                                                        |
|                      | &#124; | **_NUMBER_**                                                                           |
| _VariableDefinition_ |  ==>   | _ConstantFlag_ **_VARIABLE_TYPE_** **_IDENTIFIER_** _Assignment_                       |
|       _ConstantFlag_ |  ==>   | **constant**                                                                           |
|                      | &#124; | &#11401;                                                                               |
|         _Assignment_ |  ==>   | **=** _Expression_                                                                     |
|                      | &#124; | &#11401;                                                                               |
| _VariableAssignment_ |  ==>   | **_IDENTIFIER_** **=** _Expression_                                                    |
|     **_IDENTIFIER_** |  ==>   | **/[a-zA-Z\_][a-za-z0-9\_]\*/**                                                        |
|         **_SUM_OP_** |  ==>   | **+ &#124; -**                                                                         |
|        **_MULT_OP_** |  ==>   | **\* &#124; /**                                                                        |
|         **_NUMBER_** |  ==>   | **(\\d+\\.?\\d\*)&#124;(\\.\\d+)**                                                     |
|  **_VARIABLE_TYPE_** |  ==>   | **number**                                                                             |

The tokenizer will match the following tokens:

- Assignment
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

Global and local variables are supported. Global variables can be defined as immutable with the `constant` keyword, and an exception will be thrown if a subsequent assignment to a constant global is attempted. Local variables are always mutable, regardless of the presence of the constant flag in the definition. Local variables may have the same names as defined global variables, and will take precedence over global variables with the same name.
