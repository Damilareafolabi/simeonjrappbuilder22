const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const runnerPath = path.join(
  ROOT,
  ".factory",
  "engine",
  "autonomous-execution-runner.cjs"
);

if (!fs.existsSync(runnerPath)) {
  throw new Error("Autonomous execution runner not found.");
}

let runner = fs.readFileSync(runnerPath, "utf8");

console.log("==================================================");
console.log(" SIMEONJR EXECUTION RUNNER - PORT ALIGNMENT");
console.log("==================================================");

const replacements = [
  ["http://localhost:8000", "http://127.0.0.1:8787"],
  ["http://127.0.0.1:8000", "http://127.0.0.1:8787"],
  ["localhost:8000", "127.0.0.1:8787"],
  ["127.0.0.1:8000", "127.0.0.1:8787"]
];

let changed = false;

for (const [oldValue, newValue] of replacements) {
  if (runner.includes(oldValue)) {
    runner = runner.split(oldValue).join(newValue);
    console.log(`[PASS] ${oldValue} -> ${newValue}`);
    changed = true;
  }
}

if (!changed) {
  console.log("[INFO] No port-8000 references found in runner.");
}

fs.writeFileSync(runnerPath, runner, "utf8");

console.log("");
console.log("[1] Runner syntax");

require("child_process").execFileSync(
  process.execPath,
  ["--check", runnerPath],
  { stdio: "inherit" }
);

console.log("[PASS] Runner syntax");

console.log("");
console.log("==================================================");
console.log(" EXECUTION RUNNER PORT ALIGNMENT: PASS");
console.log("==================================================");
console.log("Backend API: 127.0.0.1:8787");
console.log("Runner API : 127.0.0.1:8787");
console.log("==================================================");
