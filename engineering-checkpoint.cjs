const fs = require("fs");
const path = require("path");

const root = __dirname;
const factory = path.join(root, ".factory");
const generated = path.join(root, "generated");
const backupRoot = path.join(factory, "backups", "engineering");

fs.mkdirSync(backupRoot, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const checkpoint = path.join(backupRoot, stamp);

fs.mkdirSync(checkpoint, { recursive: true });

const files = [
  "index.html",
  "package.json",
  "src/App.jsx",
  "src/App.css",
  "src/main.jsx"
];

const copied = [];

for (const file of files) {
  const source = path.join(generated, file);

  if (fs.existsSync(source)) {
    const destination = path.join(checkpoint, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    copied.push(file);
  }
}

const report = {
  timestamp: new Date().toISOString(),
  type: "engineering-checkpoint",
  workspace: generated,
  files: copied,
  status: "READY_FOR_AUTONOMOUS_ENGINEERING"
};

fs.writeFileSync(
  path.join(checkpoint, "checkpoint.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);

console.log("");
console.log("==================================================");
console.log(" SIMEONJR ENGINEERING CHECKPOINT ENGINE");
console.log("==================================================");
console.log("");
console.log("[PASS] Backup directory ready");
console.log("[PASS] Generated workspace scanned");
console.log("[PASS] Checkpoint created");
console.log("");
console.log("Checkpoint:", checkpoint);
console.log("Files:", copied.length);
console.log("");
console.log("AUTONOMOUS ENGINEERING CHECKPOINT: READY");
console.log("==================================================");
