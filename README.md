# Wasm Compiler

This is a React project to compile a custom language into a WebAssembly module. The project was inspired by Colin Eberhardt's [chasm](https://github.com/ColinEberhardt/chasm) project, and his [Build Your Own WebAssembly Compiler](https://youtu.be/OsGnMm59wb4) talk at [QCon San Fransisco 2019](http://bit.ly/38sivWf).

## Language Grammar

The following grammar has been implemented to this point:

|       Production |        |                                                                    |
| ---------------: | :----: | :----------------------------------------------------------------- |
|        _Program_ |  ==>   | _Function_ _Program_                                               |
|                  | &#124; | &#11401;                                                           |
|       _Function_ |  ==>   | _ExportFlag_ **_IDENTIFIER_** **(** **)** _ReturnType_ _CodeBlock_ |
|     _ExportFlag_ |  ==>   | **export**                                                         |
|                  | &#124; | &#11401;                                                           |
|     _ReturnType_ |  ==>   | &#11401;                                                           |
|      _CodeBlock_ |  ==>   | **{** _BlockStatement_\* **}**                                     |
| _BlockStatement_ |  ==>   | _FunctionCall_ **;**                                               |
|   _FunctionCall_ |  ==>   | **_IDENTIFIER_** **.** **_IDENTIFIER_** **(** **_NUMBER_** **)**   |
| **_IDENTIFIER_** |  ==>   | **/[a-zA-Z\_][a-za-z0-9\_]\*/**                                    |
|     **_NUMBER_** |  ==>   | **/(\\d+\\.?\\d\*)&#124;(\\.\\d+)/**                               |

The tokenizer will match the following tokens:

- IDENTIFIER
- KEYWORD
- LEFT_BRACE
- LEFT_PAREN
- NUMBER
- PERIOD
- RIGHT_BRACE
- RIGHT_PAREN
- SEMICOLON
- WHITESPACE (This token will not be passed on to the parser)

Language Keywords:
- `export`

If a function is defined with the `export` keyword, it will available to be called from the module in a JavaScript program.

Function calls in the format **_IDENTIFIER_._IDENTIFIER_**(...) are imported functions, with the first identifier being the import module, and the second identifier being the name of the function.  The compiler will define default imports under the "system" module.

Currently, the only defined import is `system.output` which as per the current language grammar, expects a number as input.  To successfully instantiate a compiled module, a proper import object must be provided during instantiation that will map a JavaScript function to the system.output import.  For example the following object maps the `console.log` function to the `system.output` import:
```javascript
{
  system: {
    output: console.log  // Map console.log to the system.output import
  }
}
```
