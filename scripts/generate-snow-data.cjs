const fs = require("fs");
const path = require("path");
const { writeSnowModule } = require("./lib/write-snow-module.cjs");

const templatePath = path.resolve(__dirname, "..", "data", "snow-template.json");

const payload = JSON.parse(fs.readFileSync(templatePath, "utf8"));
writeSnowModule(payload);

console.log("Wrote js/snow-data.js from data/snow-template.json");
