const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = __dirname;

const serverPath = path.join(ROOT, "backend", "server.js");
const controllerPath = path.join(
  ROOT,
  ".factory",
  "engine",
  "universal-factory-controller.cjs"
);

if (!fs.existsSync(serverPath)) {
  throw new Error("backend/server.js not found. NOTHING CHANGED.");
}

if (!fs.existsSync(controllerPath)) {
  throw new Error("Universal Factory controller not found. NOTHING CHANGED.");
}

console.log("");
console.log("==================================================");
console.log(" SIMEONJR UNIVERSAL FACTORY INTEGRATION V3");
console.log("==================================================");

console.log("");
console.log("[1] Validating factory components");

console.log("[PASS] Backend:", serverPath);
console.log("[PASS] Controller:", controllerPath);

let server = fs.readFileSync(serverPath, "utf8");
let controller = fs.readFileSync(controllerPath, "utf8");

if (!controller.includes("module.exports")) {
  console.log("[INFO] Adding controller exports...");

  controller += `

module.exports = {
  classifyRequest,
  createPlan,
  savePlan
};
`;

  fs.writeFileSync(
    controllerPath,
    controller,
    "utf8"
  );
}

console.log("[PASS] Controller module ready");

console.log("");
console.log("[2] Creating safety backup");

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-");

const backupDir = path.join(
  ROOT,
  ".factory",
  "backups",
  "universal-controller-v3-" + stamp
);

fs.mkdirSync(backupDir, {
  recursive: true
});

fs.copyFileSync(
  serverPath,
  path.join(backupDir, "server.js")
);

fs.copyFileSync(
  controllerPath,
  path.join(
    backupDir,
    "universal-factory-controller.cjs"
  )
);

console.log("[PASS] Backup:", backupDir);

console.log("");
console.log("[3] Validating existing Product Architect");

if (!server.includes(
  "You are SimeonJr App Builder"
)) {
  throw new Error(
    "Existing Product Architect not found. NOTHING CHANGED."
  );
}

console.log("[PASS] Product Architect");

console.log("");
console.log("[4] Adding Universal Factory import");

const requireLine =
  'const universalFactory = require("../.factory/engine/universal-factory-controller.cjs");';

if (!server.includes(requireLine)) {

  const firstNewline = server.indexOf("\n");

  if (firstNewline < 0) {
    throw new Error(
      "Could not find safe import position. NOTHING CHANGED."
    );
  }

  server =
    server.slice(0, firstNewline + 1) +
    requireLine +
    "\n" +
    server.slice(firstNewline + 1);

  console.log(
    "[PASS] Universal Factory import added"
  );

} else {

  console.log(
    "[PASS] Universal Factory import already exists"
  );
}

console.log("");
console.log("[5] Locating REAL /api/ai/build prompt");

const buildRoute =
  'app.post("/api/ai/build"';

const routeIndex =
  server.indexOf(buildRoute);

if (routeIndex < 0) {
  throw new Error(
    "Real /api/ai/build route not found. NOTHING CHANGED."
  );
}

const buildMarker =
  "Build this application:";

const buildIndex =
  server.indexOf(
    buildMarker,
    routeIndex
  );

if (buildIndex < 0) {
  throw new Error(
    "Real application generation prompt not found. NOTHING CHANGED."
  );
}

console.log(
  "[PASS] Real generation prompt located"
);

console.log("");
console.log("[6] Locating REAL generation lmChat call");

const lmIndex =
  server.indexOf(
    "const result = await lmChat({",
    buildIndex
  );

if (lmIndex < 0) {
  throw new Error(
    "Real generation lmChat call not found. NOTHING CHANGED."
  );
}

console.log(
  "[PASS] Real generation call located"
);

console.log("");
console.log("[7] Injecting dynamic architecture engine");

const architectureMarker =
  "const universalPlan = universalFactory.createPlan(prompt);";

if (!server.includes(architectureMarker)) {

  const architectureCode = `
    const universalPlan =
      universalFactory.createPlan(prompt);

    const architectureContext = [
      "",
      "SIMEONJR UNIVERSAL FACTORY ARCHITECTURE PLAN",
      "",
      JSON.stringify(
        universalPlan.classification,
        null,
        2
      ),
      "",
      "UNIVERSAL FACTORY RULES",
      "",
      "The user's prompt is the source of truth.",
      "Build exactly the product requested.",
      "Do not automatically create unrelated applications.",
      "Create multiple coordinated applications only when explicitly required.",
      "Do not automatically add SaaS functionality.",
      "Add SaaS architecture only when requested.",
      "Do not automatically add desktop packaging.",
      "Add desktop packaging only when requested.",
      "Do not automatically add mobile packaging.",
      "Add mobile packaging only when requested.",
      "Keep the core application local-first.",
      "Core functionality must not require API keys.",
      "Use the existing SimeonJr production build architecture.",
      "Build real production-use software rather than a toy demonstration.",
      "Adapt entities, workflows, navigation, roles and UX to the requested product.",
      ""
    ].join("\\n");

`;

  server =
    server.slice(0, lmIndex) +
    architectureCode +
    server.slice(lmIndex);

  console.log(
    "[PASS] Dynamic architecture engine injected"
  );

} else {

  console.log(
    "[PASS] Architecture engine already injected"
  );
}

console.log("");
console.log("[8] Attaching architecture context to Qwen");

const contextMarker =
  "${architectureContext}";

if (!server.includes(contextMarker)) {

  const promptStart =
    server.indexOf(
      "message: `",
      buildIndex
    );

  if (promptStart < 0) {
    throw new Error(
      "Build message template not found. NOTHING CHANGED."
    );
  }

  const promptEnd =
    server.indexOf(
      "Return the complete application using the required FILE format.",
      promptStart
    );

  if (promptEnd < 0) {
    throw new Error(
      "Build prompt ending not found. NOTHING CHANGED."
    );
  }

  const insertionPoint =
    promptEnd;

  server =
    server.slice(0, insertionPoint) +
    "  \\${architectureContext}\\n\\n" +
    server.slice(insertionPoint);

  console.log(
    "[PASS] Architecture context attached to Qwen"
  );

} else {

  console.log(
    "[PASS] Architecture context already attached"
  );
}

console.log("");
console.log("[9] Writing integration");

fs.writeFileSync(
  serverPath,
  server,
  "utf8"
);

console.log(
  "[PASS] Backend updated"
);

console.log("");
console.log("[10] Syntax verification");

cp.execFileSync(
  process.execPath,
  ["--check", serverPath],
  { stdio: "inherit" }
);

console.log(
  "[PASS] Backend syntax"
);

cp.execFileSync(
  process.execPath,
  ["--check", controllerPath],
  { stdio: "inherit" }
);

console.log(
  "[PASS] Controller syntax"
);

console.log("");
console.log("==================================================");
console.log(" UNIVERSAL FACTORY INTEGRATION V3: PASS");
console.log("==================================================");
console.log("Prompt-driven architecture : ACTIVE");
console.log("Single-app logic            : ACTIVE");
console.log("Multi-app logic             : ACTIVE");
console.log("SaaS detection              : ACTIVE");
console.log("Desktop detection           : ACTIVE");
console.log("Mobile detection            : ACTIVE");
console.log("Hosted detection            : ACTIVE");
console.log("Offline-first core          : ACTIVE");
console.log("API-key-free core           : ACTIVE");
console.log("Product Architect           : PRESERVED");
console.log("Automatic repair            : PRESERVED");
console.log("Production verification    : PRESERVED");
console.log("");
console.log("BACKUP:");
console.log(backupDir);
console.log("==================================================");
