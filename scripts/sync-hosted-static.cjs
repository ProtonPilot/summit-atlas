const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const publicRoot = path.join(projectRoot, "public");

const files = ["index.html", "resort.html", "style.css"];
const directories = ["data", "js"];

fs.mkdirSync(publicRoot, { recursive: true });

files.forEach((file) => {
  fs.copyFileSync(path.join(projectRoot, file), path.join(publicRoot, file));
});

directories.forEach((directory) => {
  fs.cpSync(path.join(projectRoot, directory), path.join(publicRoot, directory), {
    recursive: true,
    force: true
  });
});

console.log("Synchronized static Summit Atlas assets for hosting.");
