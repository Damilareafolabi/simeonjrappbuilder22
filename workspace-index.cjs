const fs = require("fs");
const path = require("path");

const ROOT = __dirname;

const IGNORE = new Set([
  "node_modules",
  ".git",
  "dist",
  ".factory"
]);

const ALLOWED_ROOTS = [
  "src",
  "backend",
  "generated"
];

function walk(dir, results = []) {
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(entry.name)) continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full, results);
    } else {
      results.push(path.relative(ROOT, full));
    }
  }

  return results;
}

const files = [];

for (const folder of ALLOWED_ROOTS) {
  const dir = path.join(ROOT, folder);

  if (fs.existsSync(dir)) {
    walk(dir, files);
  }
}

console.log("==================================================");
console.log(" SIMEONJR CONTROLLED WORKSPACE INDEX");
console.log("==================================================");
console.log("");
console.log("Scanned ONLY:");
console.log("  src/");
console.log("  backend/");
console.log("  generated/");
console.log("");
console.log("IGNORED:");
console.log("  node_modules/");
console.log("  .factory/");
console.log("  .git/");
console.log("  dist/");
console.log("");

console.log("Files indexed:", files.length);

console.log("");
console.log("==================================================");
console.log(" WORKSPACE INDEX READY");
console.log("==================================================");
