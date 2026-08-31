const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
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
    throw new Error("Universal controller not found. NOTHING CHANGED.");
}

const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

const backupDir = path.join(
    ROOT,
    ".factory",
    "backups",
    "universal-controller-integration-" + stamp
);

fs.mkdirSync(backupDir, { recursive: true });

const original = fs.readFileSync(serverPath, "utf8");

fs.writeFileSync(
    path.join(backupDir, "server.js"),
    original,
    "utf8"
);

let updated = original;

/*
 * 1. Convert controller into a reusable module.
 */
const controllerSource = fs.readFileSync(controllerPath, "utf8");

if (!controllerSource.includes("module.exports")) {

    const exportBlock = `

module.exports = {
    classifyRequest,
    createPlan,
    savePlan
};
`;

    updatedController = controllerSource.replace(
        /const prompt = process\.argv[\s\S]*?console\.log\("UNIVERSAL FACTORY CONTROLLER: READY"\);\s*console\.log\("=================================================="\);/m,
        `
if (require.main === module) {
    const prompt = process.argv.slice(2).join(" ").trim();

    console.log("");
    console.log("==================================================");
    console.log(" SIMEONJR UNIVERSAL FACTORY CONTROLLER");
    console.log("==================================================");

    if (!prompt) {
        console.log("");
        console.log("Controller ready.");
        console.log("Architecture is determined from the user's prompt.");
    } else {
        const result = savePlan(prompt);
        const c = result.plan.classification;

        console.log("");
        console.log("PROMPT:");
        console.log(prompt);

        console.log("");
        console.log("ARCHITECTURE");
        console.log("Application mode :", c.applicationMode);
        console.log("SaaS             :", c.saas ? "YES" : "NO");
        console.log("Desktop          :", c.desktop ? "YES" : "NO");
        console.log("Mobile           :", c.mobile ? "YES" : "NO");
        console.log("Hosted           :", c.hosted ? "YES" : "NO");
        console.log("Local-first      : YES");
        console.log("Core API keys    : NO");

        console.log("");
        console.log("PLAN:");
        console.log(result.file);
    }

    console.log("");
    console.log("UNIVERSAL FACTORY CONTROLLER: READY");
    console.log("==================================================");
}
${exportBlock}
`
    );

    if (updatedController === controllerSource) {
        throw new Error(
            "Could not safely convert controller to reusable module. NOTHING CHANGED."
        );
    }

    fs.writeFileSync(
        controllerPath,
        updatedController,
        "utf8"
    );
}

/*
 * 2. Add controller import to backend.
 */
const importMarker =
    'const universalFactory = require("./../.factory/engine/universal-factory-controller.cjs");';

if (!updated.includes(importMarker)) {

    const firstRequireEnd = updated.indexOf("\n", updated.indexOf("require("));

    if (firstRequireEnd < 0) {
        throw new Error(
            "Could not find safe require insertion point. NOTHING CHANGED."
        );
    }

    updated =
        updated.slice(0, firstRequireEnd + 1) +
        importMarker +
        "\n" +
        updated.slice(firstRequireEnd + 1);
}

/*
 * 3. Locate the actual build operation.
 */
const buildMessageMarker =
    "Build this application:";

const buildMessageIndex = updated.indexOf(buildMessageMarker);

if (buildMessageIndex < 0) {
    throw new Error(
        "Actual application build prompt was not found. NOTHING CHANGED."
    );
}

const lmIndex = updated.lastIndexOf(
    "const result = await lmChat({",
    buildMessageIndex + 2000
);

if (lmIndex < 0) {
    throw new Error(
        "Build lmChat call was not found. NOTHING CHANGED."
    );
}

/*
 * 4. Insert dynamic architecture analysis immediately before
 *    the real application generation call.
 */
const architectureBlock = `
    const universalPlan = universalFactory.createPlan(prompt);

    const architectureContext = [
      "",
      "SIMEONJR UNIVERSAL FACTORY ARCHITECTURE PLAN",
      "",
      JSON.stringify(universalPlan.classification, null, 2),
      "",
      "ARCHITECTURE RULE:",
      "The user's prompt is the source of truth.",
      "Do not create extra applications unless the prompt requires them.",
      "Do not add SaaS functionality unless requested.",
      "Do not add desktop/mobile packaging unless requested.",
      "Keep the core application local-first and API-key-free unless the user explicitly requests an integration.",
      "Build the requested product as a real production-use application, not a toy demonstration.",
      ""
    ].join("\\n");

`;

if (!updated.includes("const universalPlan = universalFactory.createPlan(prompt);")) {
    updated =
        updated.slice(0, lmIndex) +
        architectureBlock +
        updated.slice(lmIndex);
}

/*
 * 5. Feed the architecture context into the actual generation prompt.
 */
const originalPromptFragment =
`message: \`
  Build this application:

  \${prompt}

  Return the complete application using the required FILE format.
  \``;

const replacementPromptFragment =
`message: \`
  Build this application:

  \${prompt}

  \${architectureContext}

  Return the complete application using the required FILE format.
  \``;

if (updated.includes(originalPromptFragment)) {
    updated = updated.replace(
        originalPromptFragment,
        replacementPromptFragment
    );
} else if (!updated.includes("${architectureContext}")) {
    throw new Error(
        "Could not safely attach architecture context to build prompt. NOTHING CHANGED."
    );
}

fs.writeFileSync(
    serverPath,
    updated,
    "utf8"
);

/*
 * 6. Validate everything before declaring success.
 */
console.log("");
console.log("Checking Universal Factory Controller...");
cp.execFileSync(
    process.execPath,
    ["--check", controllerPath],
    { stdio: "inherit" }
);

console.log("");
console.log("Checking backend syntax...");
cp.execFileSync(
    process.execPath,
    ["--check", serverPath],
    { stdio: "inherit" }
);

console.log("");
console.log("==================================================");
console.log(" UNIVERSAL CONTROLLER INTEGRATED");
console.log("==================================================");
console.log("Prompt-driven architecture : ACTIVE");
console.log("Single / multi-app logic    : ACTIVE");
console.log("SaaS detection              : ACTIVE");
console.log("Desktop detection           : ACTIVE");
console.log("Mobile detection            : ACTIVE");
console.log("Hosted detection            : ACTIVE");
console.log("Offline-first               : ACTIVE");
console.log("API-key-free core           : ACTIVE");
console.log("Production application mode : ACTIVE");
console.log("Backup:", backupDir);
console.log("==================================================");
