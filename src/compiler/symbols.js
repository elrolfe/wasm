import { encodeFunctionSignature } from "./encodings";
import { arraysEqual } from "./utility";

export class SymbolTable {
  constructor(tokens) {
    this.tokens = tokens;

    this.functions = [];
    this.functionSignatures = [];
    this.globalVariables = [];
    this.importFunctions = [];
    this.localVariables = {};
  }

  addFunction(identifier, parameterList, returnType) {
    let index = this.functions.length;

    this.functions.forEach((f, i) => {
      if (f.identifier === identifier) {
        if (f.index < 0) index = i;
        // Overloading not yet supported
        else
          throw new Error(
            `[${this.tokens.current().line}:${
              this.tokens.current().column
            }] Function ${identifier} already defined at line ${f.line}, overloading not supported`
          );
      }
    });

    if (index === this.functions.length) this.functions.push({});

    this.functions[index] = {
      identifier,
      parameterList,
      returnType,
      signature: this.getSignatureIndex(parameterList, returnType),
      index: this.functions.filter(f => f.index >= 0).length,
      line: this.tokens.current().line
    };
  }

  addGlobalVariable(identifier, constant, variableType) {
    this.globalVariables
      .filter(f => f.identifier === identifier)
      .map(m => {
        throw new Error(
          `[${this.tokens.current().line}:${
            this.tokens.current().column
          }] Global variable ${identifier} already defined at line ${m.line}`
        );
      });

    this.globalVariables.push({
      identifier,
      index: this.globalVariables.length,
      constant,
      variableType,
      line: this.tokens.current().line
    });
  }

  addImportFunction(nameSpace, identifier, parameterList, returnType) {
    for (let i = 0; i < this.importFunctions.length; i++) {
      if (
        this.importFunctions[i].nameSpace === nameSpace &&
        this.importFunctions[i].identifier === identifier
      ) {
        // The function has already been imported or referenced
        if (this.importFunctions[i].index < 0)
          this.importFunctions[i].index = this.importFunctions.filter(f => f.index >= 0).length;

        return;
      }
    }

    this.importFunctions.push({
      nameSpace,
      identifier,
      parameterList,
      returnType,
      signature: this.getSignatureIndex(parameterList, returnType),
      index: this.importFunctions.filter(f => f.index >= 0).length
    });
  }

  addLocalBlock(func, parent) {
    if (!this.localVariables.hasOwnProperty(func))
      this.localVariables[func] = {
        nextIndex: 0,
        blocks: []
      };

    this.localVariables[func].blocks.push({
      parent,
      variables: []
    });
  }

  addLocalVariable(func, block, identifier, variableType) {
    this.localVariables[func].blocks[block].variables
      .filter(f => f.identifier === identifier)
      .map(m => {
        throw new Error(
          `[${this.tokens.current().line}:${
            this.tokens.current().column
          }] Local variable ${identifier} already defined at line ${m.line}`
        );
      });

    this.localVariables[func].blocks[block].variables.push({
      identifier,
      index: this.localVariables[func].nextIndex++,
      constant: false,
      variableType,
      line: this.tokens.current().line
    });
  }

  getAllLocals(func) {
    return this.localVariables[func].blocks
      .filter((_, index) => index > 0)
      .flatMap(m => m.variables);
  }

  getFunction(identifier) {
    for (let i = 0; i < this.functions.length; i++) {
      if (this.functions[i].identifier === identifier) return this.functions[i];
    }

    throw new Error(
      `Undefined function ${identifier} called at line ${this.tokens.current().line}`
    );
  }

  getImportFunction(nameSpace, identifier) {
    for (let i = 0; i < this.importFunctions.length; i++) {
      if (
        this.importFunctions[i].nameSpace === nameSpace &&
        this.importFunctions[i].identifier === identifier
      )
        return this.importFunctions[i];
    }

    throw new Error(
      `Unimported function ${nameSpace}.${identifier} called at line ${this.tokens.current().line}`
    );
  }

  getSignatureIndex(parameterList, returnType) {
    const signature = encodeFunctionSignature(parameterList, returnType);

    for (let i = 0; i < this.functionSignatures.length; i++) {
      if (arraysEqual(signature, this.functionSignatures[i])) return i;
    }

    this.functionSignatures.push(signature);
    return this.functionSignatures.length - 1;
  }

  getVariable(func, block, identifier) {
    if (this.localVariables[func]) {
      const locals = this.localVariables[func].blocks;

      while (block !== -1) {
        for (let i = 0; i < locals[block].variables.length; i++)
          if (locals[block].variables[i].identifier === identifier)
            return {
              scope: "local",
              ...locals[block].variables[i]
            };

        block = locals[block].parent;
      }
    }

    for (let i = 0; i < this.globalVariables.length; i++) {
      if (this.globalVariables[i].identifier === identifier)
        return {
          scope: "global",
          ...this.globalVariables[i]
        };
    }

    throw new Error(
      `[${this.tokens.current().line}:${
        this.tokens.current().column
      }] Undefined variable ${identifier}`
    );
  }
}
