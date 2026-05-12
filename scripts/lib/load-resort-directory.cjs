const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadResortDirectory() {
  const filePath = path.resolve(__dirname, "..", "..", "js", "resort-directory.js");
  const source = fs.readFileSync(filePath, "utf8");
  const transformed = source.replace(/^export const resortDirectory = /, "module.exports = ");
  const context = {
    module: { exports: [] },
    exports: {}
  };

  vm.runInNewContext(transformed, context, { filename: filePath });
  return context.module.exports;
}

module.exports = { loadResortDirectory };
