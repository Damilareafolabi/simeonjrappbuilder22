const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = path.resolve(__dirname, "../..");

const runnerPath = path.join(
  ROOT,
  ".factory",
  "engine",
  "autonomous-execution-runner.cjs"
);

if (!fs.existsSync(runnerPath)) {
  throw new Error("Execution runner not found.");
}

let runner = fs.readFileSync(runnerPath, "utf8");

const oldBlock = `cp.execFileSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", "build"],
  {
    cwd: ROOT,
    stdio: "inherit"
  }
);`;

const newBlock = `if (process.platform === "win32") {
  cp.execFileSync(
    process.env.ComSpec || "cmd.exe",
    ["/d", "/s", "/c", "npm run build"],
    {
      cwd: ROOT,
      stdio: "inherit",
      windowsHide: false
    }
  );
} else {
  cp.execFileSync(
    "npm",
    ["run", "build"],
    {
      cwd: ROOT,
      stdio: "inherit"
    }
  );
}`;

if (!runner.includes(oldBlock)) {
  throw new Error(
    "Expected npm build block was not found. NOTHING CHANGED."
  );
}

runner = runner.replace(
  oldBlock,
  newBlock
);

fs.writeFileSync(
  runnerPath,
  runner,
  "utf8"
);

console.log("");
console.log("==================================================");
console.log(" SIMEONJR EXECUTION RUNNER WINDOWS FIX");
console.log("==================================================");

console.log("[PASS] Runner updated");
console.log("[PASS] Windows npm execution path corrected");

console.log("");
console.log("[1] Runner syntax");

cp.execFileSync(
  process.execPath,
  ["--check", runnerPath],
  { stdio: "inherit" }
);

console.log("[PASS] Runner syntax");

console.log("");
console.log("==================================================");
console.log(" WINDOWS EXECUTION FIX: PASS");
console.log("==================================================");
