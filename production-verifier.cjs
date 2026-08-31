const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = __dirname;
const GENERATED = path.join(ROOT, "generated");
const REPORT_DIR = path.join(ROOT, ".factory", "reports");

fs.mkdirSync(REPORT_DIR, { recursive: true });

const report = {
  version: "5.1-production-verification",
  timestamp: new Date().toISOString(),
  workspace: GENERATED,
  checks: [],
  passed: 0,
  failed: 0,
  status: "UNKNOWN"
};

function check(name, fn) {
  try {
    fn();
    report.checks.push({ name, status: "PASS" });
    report.passed++;
    console.log("[PASS] " + name);
  } catch (error) {
    report.checks.push({
      name,
      status: "FAIL",
      error: String(error.message || error)
    });
    report.failed++;
    console.log("[FAIL] " + name);
    console.log("       " + String(error.message || error));
  }
}

function exists(rel) {
  return fs.existsSync(path.join(GENERATED, rel));
}

function npm(args) {
  const result = spawnSync("npm", args, {
    cwd: GENERATED,
    stdio: "inherit",
    shell: true,
    windowsHide: false
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (result.status !== 0) {
    throw new Error("npm exited with code " + result.status);
  }
}

console.log("");
console.log("==================================================");
console.log(" SIMEONJR PRODUCTION APPLICATION VERIFIER 5.1");
console.log("==================================================");
console.log("");

check("Generated workspace exists", () => {
  if (!fs.existsSync(GENERATED)) {
    throw new Error("generated workspace does not exist");
  }
});

check("index.html exists", () => {
  if (!exists("index.html")) throw new Error("index.html missing");
});

check("React entry exists", () => {
  if (!exists("src/main.jsx")) throw new Error("src/main.jsx missing");
});

check("App component exists", () => {
  if (!exists("src/App.jsx")) throw new Error("src/App.jsx missing");
});

check("App stylesheet exists", () => {
  if (!exists("src/App.css")) throw new Error("src/App.css missing");
});

check("package.json exists", () => {
  if (!exists("package.json")) throw new Error("package.json missing");
});

check("Generated package.json is valid", () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(GENERATED, "package.json"), "utf8")
  );

  if (!pkg.scripts || !pkg.scripts.build) {
    throw new Error("package.json has no build script");
  }
});

check("Generated source contains no obvious API-key placeholders", () => {
  const files = [];

  function scan(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);

      if (
        item.name === "node_modules" ||
        item.name === "dist" ||
        item.name === ".git"
      ) continue;

      if (item.isDirectory()) {
        scan(full);
      } else if (
        /\.(jsx?|css|html|json|env|txt)$/i.test(item.name)
      ) {
        files.push(full);
      }
    }
  }

  scan(GENERATED);

  const suspicious = [
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "GEMINI_API_KEY",
    "OPENROUTER_API_KEY"
  ];

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");

    for (const token of suspicious) {
      if (text.includes(token)) {
        throw new Error(
          "External API key dependency detected: " + token
        );
      }
    }
  }
});

check("Generated dependencies install", () => {
  npm(["install"]);
});

check("Clean previous production output", () => {
  const dist = path.join(GENERATED, "dist");

  if (fs.existsSync(dist)) {
    fs.rmSync(dist, {
      recursive: true,
      force: true
    });
  }

  if (fs.existsSync(dist)) {
    throw new Error("Could not remove previous dist directory");
  }
});

check("Production build succeeds", () => {
  npm(["run", "build"]);
});

check("Fresh production dist exists", () => {
  const dist = path.join(GENERATED, "dist");
  const index = path.join(dist, "index.html");

  if (!fs.existsSync(dist)) {
    throw new Error("dist directory was not created by this build");
  }

  if (!fs.existsSync(index)) {
    throw new Error("dist/index.html missing after fresh build");
  }

  const stat = fs.statSync(index);

  if (stat.size === 0) {
    throw new Error("dist/index.html is empty");
  }
});

report.status =
  report.failed === 0
    ? "PRODUCTION_READY"
    : "VERIFICATION_FAILED";

const reportPath = path.join(
  REPORT_DIR,
  "production-verification-latest.json"
);

fs.writeFileSync(
  reportPath,
  JSON.stringify(report, null, 2),
  "utf8"
);

console.log("");
console.log("==================================================");
console.log(" VERIFICATION RESULT");
console.log("==================================================");
console.log("Passed: " + report.passed);
console.log("Failed: " + report.failed);
console.log("Status: " + report.status);
console.log("Report: " + reportPath);
console.log("==================================================");
console.log("");

process.exit(report.failed === 0 ? 0 : 1);
