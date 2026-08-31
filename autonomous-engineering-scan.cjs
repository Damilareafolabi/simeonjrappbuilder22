const fs = require("fs");
const path = require("path");

const root = __dirname;
const server = path.join(root, "backend", "server.js");

console.log("==================================================");
console.log(" SIMEONJR AUTONOMOUS ENGINEERING - TARGET SCAN");
console.log("==================================================");

if (!fs.existsSync(server)) {
  console.error("[FAIL] backend/server.js not found");
  process.exit(1);
}

const s = fs.readFileSync(server, "utf8");

const checks = [
  ["LM Studio integration", /localhost:1234|127\.0\.0\.1:1234/],
  ["Agent server", /createServer|listen\(/],
  ["Generated workspace", /GENERATED|generated/],
  ["Build execution", /npm.*build|vite.*build|execFile|spawn/],
  ["Build verification", /build.*success|build.*failed|production/i],
  ["Automatic repair", /repairGeneratedBuild|repair/i],
  ["Backup system", /backup|backups/i],
  ["FILE parser", /===FILE:/],
  ["Prompt-driven architecture", /user.*prompt|prompt.*truth|MULTI-APP/i],
  ["Offline-first rules", /OFFLINE-FIRST|offline/i],
  ["SaaS rules", /SAAS|tenant|workspace/i],
  ["Multi-app rules", /MULTI-APP|multiple applications/i]
];

for (const [name, pattern] of checks) {
  console.log(
    pattern.test(s)
      ? `[PASS] ${name}`
      : `[MISSING] ${name}`
  );
}

console.log("");
console.log("=== ENDPOINTS / ROUTES ===");

const routeMatches = s.match(
  /(?:app|server)\.(?:get|post|put|patch|delete)\s*\(\s*["'`][^"'`]+/g
) || [];

if (routeMatches.length) {
  routeMatches.forEach(x => console.log(" ", x));
} else {
  console.log(" [INFO] No standard route pattern detected");
}

console.log("");
console.log("=== ENGINEERING TARGET ===");
console.log("1. Build generated application");
console.log("2. Capture build output");
console.log("3. Classify failure");
console.log("4. Send failure to local Qwen");
console.log("5. Apply repair");
console.log("6. Rebuild");
console.log("7. Repeat within safe retry limit");
console.log("8. Verify production output");
console.log("9. Save checkpoint/report");
console.log("10. Mark application COMPLETE");

console.log("");
console.log("SCAN COMPLETE");
console.log("==================================================");
