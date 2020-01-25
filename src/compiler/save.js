export const save = (function() {
  const a = document.createElement("a");
  a.style = "display: none";

  document.body.appendChild(a);

  return (data, file) => {
    const blob = new Blob([data], { type: "application/wasm" });
    const url = window.URL.createObjectURL(blob);

    a.href = url;
    a.download = file.endsWith(".wasm") ? file : `${file}.wasm`;
    a.click();

    window.URL.revokeObjectURL(url);
  };
})();
