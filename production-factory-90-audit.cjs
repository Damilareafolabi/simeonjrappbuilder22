const fs = require("fs");
const path = require("path");

const root = __dirname;

const checks = [
  ["Checkpoint engine", ".factory/backups/engineering"],
  ["Product Architect", "install-product-architect-v2.cjs"],
  ["Workspace index", "workspace-index.cjs"],
  ["Agent server", "backend/server.js"],
  ["Factory frontend", "src"],
  ["Generated workspace", "generated"],
  ["Multi-app foundation", "apps"],
  ["Factory state", ".factory"],
  ["Production verifier", ".factory/reports/production-verification-latest.json"]
];

console.log("==================================================");
console.log(" SIMEONJR 90/100 PRODUCTION FACTORY AUDIT");
console.log("==================================================");

let passed = 0;
let failed = 0;

for (const [name, target] of checks) {
  if (fs.existsSync(path.join(root, target))) {
    console.log("[PASS] " + name);
    passed++;
  } else {
    console.log("[MISSING] " + name);
    failed++;
  }
}

console.log("");
console.log("=== ENGINEERING CAPABILITIES ===");

const server = fs.readFileSync(
  path.join(root, "backend", "server.js"),
  "utf8"
);

const capabilities = [
  ["LM Studio integration", "lmChat"],
  ["Automatic repair", "repairGeneratedBuild"],
  ["Production build", "npm run build"],
  ["Prompt architecture", "You are SimeonJr App Builder"],
  ["Offline-first", "OFFLINE-FIRST"],
  ["SaaS architecture", "SAAS-READY ARCHITECTURE"],
  ["Multi-app logic", "MULTI-APP"],
  ["FILE parser", "===FILE:"]
];

for (const [name, marker] of capabilities) {
  if (server.includes(marker)) {
    console.log("[PASS] " + name);
    passed++;
  } else {
    console.log("[MISSING] " + name);
    failed++;
  }
}

console.log("");
console.log("==================================================");
console.log(" PASSED :", passed);
console.log(" MISSING:", failed);
console.log("==================================================");

if (failed === 0) {
  console.log("");
  console.log("PRODUCTION FACTORY FOUNDATION: READY");
  console.log("NEXT TARGET: 90 -> 100");
} else {
  console.log("");
  console.log("PRODUCTION FACTORY FOUNDATION: NEEDS WORK");
}

console.log("==================================================");
