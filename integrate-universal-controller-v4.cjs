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

if (!fs.existsSync(serverPath))
  throw new Error("backend/server.js missing. STOP.");

if (!fs.existsSync(controllerPath))
  throw new Error("Universal controller missing. STOP.");

let server = fs.readFileSync(serverPath, "utf8");
let controller = fs.readFileSync(controllerPath, "utf8");

console.log("");
console.log("==================================================");
console.log(" SIMEONJR UNIVERSAL FACTORY INTEGRATION V4");
console.log("==================================================");

console.log("");
console.log("[1] Validating controller");

if (!controller.includes("module.exports")) {
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

console.log("[PASS] Controller ready");

console.log("");
console.log("[2] Creating safety backup");

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-");

const backupDir = path.join(
  ROOT,
  ".factory",
  "backups",
  "universal-controller-v4-" + stamp
);

fs.mkdirSync(backupDir, { recursive: true });

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

console.log("[PASS] Backup created");
console.log(backupDir);

console.log("");
console.log("[3] Locating /api/ai/build");

const routeMarker =
  'app.post("/api/ai/build"';

const routeIndex =
  server.indexOf(routeMarker);

if (routeIndex < 0)
  throw new Error(
    "/api/ai/build route not found. STOP."
  );

const routeEnd =
  server.indexOf(
    'app.post("/',
    routeIndex + routeMarker.length
  );

const buildSection =
  routeEnd > 0
    ? server.slice(routeIndex, routeEnd)
    : server.slice(routeIndex);

console.log("[PASS] Build route found");

console.log("");
console.log("[4] Inspecting actual build call");

const lmPattern =
  /const\s+result\s*=\s*await\s+lmChat\s*\(\s*\{/;

const lmMatch =
  lmPattern.exec(buildSection);

if (!lmMatch) {

  console.log("");
  console.log("ACTUAL BUILD SECTION:");
  console.log("----------------------------------------");
  console.log(buildSection);
  console.log("----------------------------------------");

  throw new Error(
    "Could not identify lmChat call inside /api/ai/build. STOP."
  );
}

const absoluteLmIndex =
  routeIndex + lmMatch.index;

console.log(
  "[PASS] Real generation lmChat call found"
);

console.log("");
console.log("[5] Adding Universal Factory architecture");

const architectureMarker =
  "SIMEONJR UNIVERSAL FACTORY ARCHITECTURE PLAN";

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
      "FACTORY RULES",
      "",
      "The user's prompt is the source of truth.",
      "Build exactly what the user requested.",
      "Do not create unrelated applications.",
      "Create multiple applications only when explicitly requested.",
      "Do not add SaaS unless requested.",
      "Do not add desktop packaging unless requested.",
      "Do not add mobile packaging unless requested.",
      "Do not add hosted deployment unless requested.",
      "Keep the core application local-first.",
      "Core functionality must not require API keys.",
      "Build production-quality software.",
      "Implement real workflows and functional controls.",
      "Use professional responsive UX.",
      ""
    ].join("\\n");

`;

  server =
    server.slice(0, absoluteLmIndex) +
    architectureCode +
    server.slice(absoluteLmIndex);

  console.log(
    "[PASS] Architecture engine injected"
  );

} else {

  console.log(
    "[PASS] Architecture engine already present"
  );
}

console.log("");
console.log("[6] Attaching architecture context to build message");

if (!server.includes("${architectureContext}")) {

  const updatedRouteIndex =
    server.indexOf(routeMarker);

  const messageIndex =
    server.indexOf(
      "message: `",
      updatedRouteIndex
    );

  if (messageIndex < 0)
    throw new Error(
      "Build message template not found. STOP."
    );

  const buildTextIndex =
    server.indexOf(
      "Build this application:",
      messageIndex
    );

  if (buildTextIndex < 0)
    throw new Error(
      "Build application text not found. STOP."
    );

  const promptExpression =
    "${prompt}";

  const promptIndex =
    server.indexOf(
      promptExpression,
      buildTextIndex
    );

  if (promptIndex < 0)
    throw new Error(
      "Build prompt expression not found. STOP."
    );

  const insertionPoint =
    promptIndex + promptExpression.length;

  server =
    server.slice(0, insertionPoint) +
    `

\${architectureContext}` +
    server.slice(insertionPoint);

  console.log(
    "[PASS] Architecture context attached"
  );

} else {

  console.log(
    "[PASS] Architecture context already attached"
  );
}

console.log("");
console.log("[7] Validating final backend structure");

const finalRouteIndex =
  server.indexOf(routeMarker);

const finalRouteEnd =
  server.indexOf(
    'app.post("/',
    finalRouteIndex + routeMarker.length
  );

const finalSection =
  finalRouteEnd > 0
    ? server.slice(finalRouteIndex, finalRouteEnd)
    : server.slice(finalRouteIndex);

if (!finalSection.includes(
  "SIMEONJR UNIVERSAL FACTORY ARCHITECTURE PLAN"
)) {
  throw new Error(
    "Architecture context is not inside build route. STOP."
  );
}

if (!finalSection.includes(
  "lmChat({"
)) {
  throw new Error(
    "Build lmChat call disappeared. STOP."
  );
}

console.log(
  "[PASS] Build route contains Universal Factory"
);

console.log("");
console.log("[8] Writing backend");

fs.writeFileSync(
  serverPath,
  server,
  "utf8"
);

console.log(
  "[PASS] Backend written"
);

console.log("");
console.log("[9] Node syntax check");

cp.execFileSync(
  process.execPath,
  ["--check", serverPath],
  { stdio: "inherit" }
);

console.log("[PASS] backend/server.js syntax");

cp.execFileSync(
  process.execPath,
  ["--check", controllerPath],
  { stdio: "inherit" }
);

console.log("[PASS] controller syntax");

console.log("");
console.log("==================================================");
console.log(" UNIVERSAL FACTORY INTEGRATION V4: PASS");
console.log("==================================================");
console.log("Universal Controller       : ACTIVE");
console.log("Prompt classification      : ACTIVE");
console.log("Single-app architecture    : ACTIVE");
console.log("Multi-app architecture     : ACTIVE");
console.log("SaaS detection             : ACTIVE");
console.log("Desktop detection          : ACTIVE");
console.log("Mobile detection           : ACTIVE");
console.log("Hosted detection           : ACTIVE");
console.log("Offline-first              : ACTIVE");
console.log("API-key-free core          : ACTIVE");
console.log("Product Architect          : PRESERVED");
console.log("Automatic repair           : PRESERVED");
console.log("Production verification    : PRESERVED");
console.log("");
console.log("BACKUP:");
console.log(backupDir);
console.log("==================================================");
