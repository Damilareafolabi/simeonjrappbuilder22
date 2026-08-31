const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();

const serverPath = path.join(
  ROOT,
  "backend",
  "server.js"
);

const controllerPath = path.join(
  ROOT,
  ".factory",
  "engine",
  "universal-factory-controller.cjs"
);

if (!fs.existsSync(serverPath)) {
  throw new Error("backend/server.js not found.");
}

if (!fs.existsSync(controllerPath)) {
  throw new Error("Universal Factory controller not found.");
}

let server = fs.readFileSync(serverPath, "utf8");

console.log("");
console.log("==================================================");
console.log(" SIMEONJR UNIVERSAL FACTORY RUNTIME FIX");
console.log("==================================================");

console.log("");
console.log("[1] Checking Universal Factory import");

const importLine =
  'import universalFactory from "../.factory/engine/universal-factory-controller.cjs";';

const requireLine =
  'const universalFactory = require("../.factory/engine/universal-factory-controller.cjs");';

if (
  server.includes(importLine) ||
  server.includes(requireLine)
) {
  console.log("[PASS] Universal Factory reference already present");
} else {
  console.log("[INFO] Adding Universal Factory import");

  const lines = server.split(/\r?\n/);

  let insertAt = 0;

  while (
    insertAt < lines.length &&
    (
      lines[insertAt].startsWith("import ") ||
      lines[insertAt].trim() === ""
    )
  ) {
    insertAt++;
  }

  lines.splice(insertAt, 0, importLine);

  server = lines.join("\n");

  console.log("[PASS] Universal Factory import added");
}

console.log("");
console.log("[2] Checking controller export compatibility");

const controller = fs.readFileSync(
  controllerPath,
  "utf8"
);

if (!controller.includes("module.exports")) {
  throw new Error(
    "Universal controller has no module.exports. STOP."
  );
}

console.log("[PASS] Controller exports detected");

console.log("");
console.log("[3] Creating safety backup");

const backupDir = path.join(
  ROOT,
  ".factory",
  "backups",
  "runtime-fix-" +
    new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
);

fs.mkdirSync(backupDir, {
  recursive: true
});

fs.copyFileSync(
  serverPath,
  path.join(backupDir, "server.js")
);

console.log("[PASS] Backup:", backupDir);

console.log("");
console.log("[4] Writing backend");

fs.writeFileSync(
  serverPath,
  server,
  "utf8"
);

console.log("[PASS] Backend updated");

console.log("");
console.log("[5] Backend syntax");

cp.execFileSync(
  process.execPath,
  ["--check", serverPath],
  { stdio: "inherit" }
);

console.log("[PASS] Backend syntax");

console.log("");
console.log("[6] Runtime import test");

const testCode = `
import("./backend/server.js")
  .then(() => {
    console.log("[PASS] Backend runtime import");
    process.exit(0);
  })
  .catch(error => {
    console.error("[FAIL] Backend runtime import");
    console.error(error);
    process.exit(1);
  });
`;

const testFile = path.join(
  ROOT,
  ".factory",
  "engine",
  "runtime-import-test.mjs"
);

fs.writeFileSync(
  testFile,
  testCode,
  "utf8"
);

try {
  cp.execFileSync(
    process.execPath,
    [testFile],
    {
      cwd: ROOT,
      stdio: "inherit"
    }
  );
} finally {
  if (fs.existsSync(testFile)) {
    fs.unlinkSync(testFile);
  }
}

console.log("");
console.log("==================================================");
console.log(" UNIVERSAL FACTORY RUNTIME FIX: PASS");
console.log("==================================================");
console.log("Universal Factory import : ACTIVE");
console.log("Controller exports       : VALID");
console.log("Backend syntax           : PASS");
console.log("Runtime import           : PASS");
console.log("==================================================");
