import React, { useState } from "react";
import "./App.scss";

import { compile } from "./compiler/compiler";
import { save } from "./compiler/save";

let message;

function compileSource(code, setOutput) {
  message = "Compiling...\n";
  setOutput(message);

  return new Promise(resolve => {
    resolve(compile(code));
  }).then(wasm => {
    message += "Compilation successful\n";
    setOutput(message);

    return wasm;
  });
}

function compileAndRun(code, setOutput) {
  compileSource(code, setOutput)
    .then(wasm => {
      message += "Instantiating...\n";
      setOutput(message);

      return WebAssembly.instantiate(wasm, {});
    })
    .then(result => {
      message += "Instantiation complete\n";
      setOutput(message);
    });
}

function compileAndDownload(code, setOutput) {
  compileSource(code, setOutput).then(wasm => {
    message += "Saving...\n";
    setOutput(message);
    save(wasm, "module");
  });
}

function App() {
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");

  return (
    <div className="App">
      <div className="container">
        <h1 className="title is-1">Wasm Compiler</h1>
        <h2 className="subtitle is-3">Compiles a custom made language into Wasm modules</h2>
        <div className="columns">
          <div className="column">
            <div className="field">
              <label className="label">Code</label>
              <div className="control">
                <textarea
                  rows="20"
                  className="textarea"
                  placeholder="Enter your code here"
                  value={code}
                  onChange={({ target }) => setCode(target.value)}
                ></textarea>
              </div>
            </div>
            <div className="buttons">
              <button
                className="button is-dark is-outlined"
                onClick={() => compileSource(code, setOutput)}
              >
                Compile
              </button>
              <button
                className="button is-info is-outlined"
                onClick={() => compileAndRun(code, setOutput)}
              >
                Compile &amp; Run
              </button>
              <button
                className="button is-success is-outlined"
                onClick={() => compileAndDownload(code, setOutput)}
              >
                Compile &amp; Download
              </button>
            </div>
          </div>
          <div className="column">
            <div className="field">
              <label className="label">Output</label>
              <div className="control">
                <textarea rows="20" readOnly className="textarea" value={output}></textarea>
              </div>
            </div>
            <div className="buttons">
              <button className="button is-danger is-outlined" onClick={() => setOutput("")}>
                Clear Log
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
