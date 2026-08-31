const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = __dirname;
const serverPath = path.join(ROOT, "backend", "server.js");

if (!fs.existsSync(serverPath)) {
  throw new Error("backend/server.js not found.");
}

let server = fs.readFileSync(serverPath, "utf8");

console.log("==================================================");
console.log(" SIMEONJR BACKEND PORT ALIGNMENT FIX");
console.log("==================================================");

console.log("[1] Checking backend port");

if (!server.includes("const PORT = 8787;")) {
  throw new Error("Expected PORT = 8787 was not found. STOP.");
}

console.log("[PASS] Backend uses port 8787");

console.log("");
console.log("[2] Checking health endpoint");

if (!server.includes('app.get("/api/health"')) {
  throw new Error("Health endpoint missing. STOP.");
}

console.log("[PASS] Health endpoint exists");

console.log("");
console.log("[3] Checking server listen");

if (!server.includes('app.listen(PORT, "127.0.0.1"')) {
  throw new Error("Expected server listen configuration missing. STOP.");
}

console.log("[PASS] Server listens on 127.0.0.1:8787");

console.log("");
console.log("[4] Creating launcher");

const launcherPath = path.join(
  ROOT,
  ".factory",
  "engine",
  "start-agent-backend.cjs"
);

const launcher = `
const { spawn } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const server = path.join(ROOT, "backend", "server.js");

console.log("");
console.log("==================================================");
console.log(" SIMEONJR AGENT BACKEND");
console.log("==================================================");
console.log("API: http://127.0.0.1:8787");
console.log("Health: http://127.0.0.1:8787/api/health");
console.log("");
console.log("Starting backend...");
console.log("");

const child = spawn(
  process.execPath,
  [server],
  {
    cwd: ROOT,
    stdio: "inherit",
    windowsHide: false
  }
);

child.on("error", error => {
  console.error("[FAIL] Backend process:", error.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  console.log("");
  console.log("[INFO] Backend stopped.");
  console.log("Code:", code);
  console.log("Signal:", signal || "none");
  process.exit(code || 0);
});
`;

fs.writeFileSync(launcherPath, launcher.trimStart(), "utf8");

console.log("[PASS] Backend launcher created");

console.log("");
console.log("[5] Syntax validation");

cp.execFileSync(
  process.execPath,
  ["--check", serverPath],
  { stdio: "inherit" }
);

cp.execFileSync(
  process.execPath,
  ["--check", launcherPath],
  { stdio: "inherit" }
);

console.log("[PASS] Backend syntax");
console.log("[PASS] Launcher syntax");

console.log("");
console.log("==================================================");
console.log(" BACKEND PORT FIX: PASS");
console.log("==================================================");
console.log("Backend port : 8787");
console.log("Health URL   : http://127.0.0.1:8787/api/health");
console.log("Launcher     : ACTIVE");
console.log("==================================================");
`;

fs.writeFileSync(
  path.join(ROOT, ".factory", "engine", "fix-backend-port.cjs"),
  launcher,
  "utf8"
);

console.log("[PASS] Fix script written");
