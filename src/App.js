import React, { useState } from "react";
import "./App.scss";

import { compile } from "./compiler/compiler";
import { save } from "./compiler/utility";

let message;
let setOutput;

function log(text, clear) {
  if (clear) message = "";
  message += `${text}\n`;
  setOutput(message);
}

function compileSource(code, setOutput) {
  log("Compiling...", true);
  return new Promise(resolve => {
    resolve(compile(code));
  })
    .then(wasm => {
      log("Compilation successful");
      return wasm;
    })
    .catch(e => {
      console.log(e);
      log("Compilation failed!");
    });
}

function compileAndRun(code, setOutput) {
  compileSource(code, setOutput)
    .then(wasm => {
      log("Instantiating...");

      return WebAssembly.instantiate(wasm, {
        system: {
          output: log
        }
      });
    })
    .then(result => {
      log("Instantiation complete");

      return result;
    })
    .then(result => {
      log("Running...\n--------------------\n");
      result.instance.exports.main();
    })
    .then(result => {
      log("\n--------------------\nRun completed");
    })
    .catch(e => {
      console.log(e);
      log("Instantiation failed!");
    });
}

function compileAndDownload(code, setOutput) {
  compileSource(code, setOutput).then(wasm => {
    log("Saving...");
    setOutput(message);
    save(wasm, "module");
  });
}

function App() {
  const [code, setCode] = useState("export main() {\n  system.output(1 + 1);\n}\n");
  const [output, setOutputFn] = useState("");
  let upload;

  setOutput = setOutputFn;

  return (
    <div className="App">
      <div className="container">
        <h1 className="title is-1">Wasm Compiler</h1>
        <h2 className="subtitle is-3">Compiles a custom made language into Wasm modules</h2>
        <div className="columns">
          <div className="column">
            <div className="field">
              <label className="label">
                Code{" "}
                <button
                  className="button is-dark is-small is-outlined"
                  onClick={() => upload.click()}
                >
                  Load Script
                </button>
              </label>
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
              <label className="label">Output Log</label>
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
      <input
        type="file"
        ref={ref => (upload = ref)}
        style={{ display: "none" }}
        onChange={({ target }) => {
          if (target.files.length > 0) {
            const reader = new FileReader();
            reader.onload = ({ target }) => setCode(target.result);
            reader.readAsText(target.files[0]);
          }
        }}
      />
    </div>
  );
}

export default App;
