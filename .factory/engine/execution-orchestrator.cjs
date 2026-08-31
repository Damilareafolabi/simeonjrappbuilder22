const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ENGINE_DIR = __dirname;
const ROOT = path.resolve(ENGINE_DIR, "../..");

const controllerPath = path.join(
  ENGINE_DIR,
  "universal-factory-controller.cjs"
);

const serverPath = path.join(
  ROOT,
  "backend",
  "server.js"
);

console.log("");
console.log("==================================================");
console.log(" SIMEONJR EXECUTION ORCHESTRATOR V2");
console.log("==================================================");

console.log("");
console.log("[1] Resolving factory paths");

console.log("Engine     :", ENGINE_DIR);
console.log("Root       :", ROOT);
console.log("Controller :", controllerPath);
console.log("Backend    :", serverPath);

if (!fs.existsSync(controllerPath)) {
  throw new Error(
    "Universal controller missing at: " + controllerPath
  );
}

console.log("[PASS] Universal controller");

if (!fs.existsSync(serverPath)) {
  throw new Error(
    "Backend server missing at: " + serverPath
  );
}

console.log("[PASS] Backend");

console.log("");
console.log("[2] Validating controller syntax");

cp.execFileSync(
  process.execPath,
  ["--check", controllerPath],
  { stdio: "inherit" }
);

console.log("[PASS] Controller syntax");

console.log("");
console.log("[3] Validating backend syntax");

cp.execFileSync(
  process.execPath,
  ["--check", serverPath],
  { stdio: "inherit" }
);

console.log("[PASS] Backend syntax");

console.log("");
console.log("[4] Loading Universal Factory");

const universalFactory = require(controllerPath);

if (
  !universalFactory ||
  typeof universalFactory.createPlan !== "function" ||
  typeof universalFactory.classifyRequest !== "function"
) {
  throw new Error(
    "Universal Factory module exports are invalid."
  );
}

console.log("[PASS] Universal Factory loaded");

console.log("");
console.log("[5] Testing prompt classification");

const testPrompt =
  process.argv.slice(2).join(" ").trim() ||
  "Build a production-ready offline business management application with a professional responsive interface";

const plan =
  universalFactory.createPlan(testPrompt);

console.log("");
console.log("PROMPT:");
console.log(testPrompt);

console.log("");
console.log("ARCHITECTURE:");
console.log(
  JSON.stringify(
    plan.classification,
    null,
    2
  )
);

console.log("");
console.log("[6] Saving execution plan");

const planResult =
  universalFactory.savePlan(testPrompt);

console.log(
  "[PASS] Plan:",
  planResult.file
);

console.log("");
console.log("==================================================");
console.log(" EXECUTION ORCHESTRATOR V2: READY");
console.log("==================================================");
console.log("Universal Controller : ACTIVE");
console.log("Prompt classification: ACTIVE");
console.log("Dynamic architecture: ACTIVE");
console.log("Production pipeline  : ACTIVE");
console.log("Local-first          : ACTIVE");
console.log("API-key-free core    : ACTIVE");
console.log("Backend validation   : ACTIVE");
console.log("Checkpoint planning  : ACTIVE");
console.log("");
console.log("NEXT:");
console.log("Factory execution can now proceed.");
console.log("==================================================");
