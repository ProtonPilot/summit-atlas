const fs = require("fs");
const path = require("path");
const { loadResortDirectory } = require("./lib/load-resort-directory.cjs");

const templatePath = path.resolve(__dirname, "..", "data", "snow-template.json");
const overridesPath = path.resolve(__dirname, "..", "data", "historical-month-overrides.json");
const resorts = loadResortDirectory();
const template = JSON.parse(fs.readFileSync(templatePath, "utf8"));
const overrides = JSON.parse(fs.readFileSync(overridesPath, "utf8"));

const rows = resorts.map((resort) => {
  const snow = template.resorts[resort.id] || {};
  const computed = snow.computedHighestHistoricalMonth || snow.highestHistoricalMonth || "Not available yet";
  const previousYear = snow.previousYearSnowiestMonth || "";
  const manual = overrides[resort.id] || snow.manualHighestHistoricalMonth || "";
  const display = manual || snow.highestHistoricalMonth || computed;
  const status = manual ? "OVERRIDDEN" : "AUTO";

  return {
    resort: resort.name,
    computed,
    previousYear,
    manual,
    display,
    status
  };
});

console.table(rows);
