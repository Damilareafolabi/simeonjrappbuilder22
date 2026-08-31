const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const runnerPath = path.join(ROOT, ".factory", "engine", "autonomous-execution-runner.cjs");
const serverPath = path.join(ROOT, "backend", "server.js");

if (!fs.existsSync(runnerPath)) throw new Error("Runner missing.");
if (!fs.existsSync(serverPath)) throw new Error("Backend missing.");

let runner = fs.readFileSync(runnerPath, "utf8");

const marker = 'console.log("NEXT STAGE          : GENERATE");';

if (!runner.includes(marker)) {
  throw new Error("Runner checkpoint marker not found. NOTHING CHANGED.");
}

if (runner.includes("SIMEONJR EXECUTION LOOP V1")) {
  console.log("[INFO] Execution loop already installed.");
  process.exit(0);
}

const executionCode = `

console.log("");
console.log("==================================================");
console.log(" SIMEONJR EXECUTION LOOP V1");
console.log("==================================================");

const http = require("http");

const API = "http://127.0.0.1:8787";
const generatedDir = path.join(ROOT, "generated");

function requestBuild(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      prompt,
      projectRoot: ROOT
    });

    const req = http.request(
      API + "/api/ai/build",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body)
        },
        timeout: 15 * 60 * 1000
      },
      res => {
        let data = "";

        res.on("data", chunk => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);

            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(
                new Error(
                  parsed.error ||
                  "Build endpoint returned HTTP " + res.statusCode
                )
              );
            }
          } catch {
            reject(
              new Error(
                "Invalid response from build endpoint: " + data.slice(0, 500)
              )
            );
          }
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error("Build request timed out."));
    });

    req.on("error", reject);

    req.write(body);
    req.end();
  });
}

function runBuild() {
  return new Promise(resolve => {
    console.log("");
    console.log("[BUILD] Running generated production build...");

    const child = cp.spawn(
      process.platform === "win32"
        ? (process.env.ComSpec || "cmd.exe")
        : "npm",
      process.platform === "win32"
        ? ["/d", "/s", "/c", "npm run build"]
        : ["run", "build"],
      {
        cwd: generatedDir,
        stdio: "inherit",
        windowsHide: false
      }
    );

    child.on("error", error => {
      resolve({
        ok: false,
        error: error.message
      });
    });

    child.on("exit", code => {
      resolve({
        ok: code === 0,
        code
      });
    });
  });
}

async function executeFactory() {
  console.log("");
  console.log("[1] GENERATE");
  console.log("Sending request to local SimeonJr Agent...");

  let generation;

  try {
    generation = await requestBuild(prompt);
  } catch (error) {
    console.error("[FAIL] Generation:", error.message);
    process.exitCode = 1;
    return;
  }

  console.log("[PASS] Generation response received");

  if (generation.ok === false) {
    console.error("[FAIL] Generation:", generation.error || "Unknown error");
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("[2] GENERATED FILES");

  if (fs.existsSync(generatedDir)) {
    const files = [];

    function collect(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (
          entry.name === "node_modules" ||
          entry.name === "dist" ||
          entry.name.startsWith(".")
        ) {
          continue;
        }

        const full = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          collect(full);
        } else {
          files.push(path.relative(generatedDir, full));
        }
      }
    }

    collect(generatedDir);

    console.log("[PASS] Generated files:", files.length);

    files.slice(0, 30).forEach(file => {
      console.log("  ", file);
    });
  }

  console.log("");
  console.log("[3] BUILD");

  let buildResult = await runBuild();

  if (buildResult.ok) {
    console.log("[PASS] Generated production build");
  } else {
    console.log("");
    console.log("[FAIL] Generated production build");
    console.log("Exit code:", buildResult.code);

    console.log("");
    console.log("[4] REPAIR");

    console.log(
      "[INFO] Backend automatic repair system is responsible for build repair."
    );

    try {
      const repair = await requestBuild(
        prompt +
        "\\n\\nIMPORTANT: The previously generated application failed its production build. " +
        "Inspect the existing generated application, repair the actual build failure, " +
        "preserve the requested functionality and UX, and return the corrected files."
      );

      if (repair && repair.ok !== false) {
        console.log("[PASS] Repair response received");

        console.log("");
        console.log("[5] REBUILD");

        buildResult = await runBuild();

        if (buildResult.ok) {
          console.log("[PASS] Rebuild successful");
        } else {
          console.log("[FAIL] Rebuild failed");
          process.exitCode = 1;
          return;
        }
      } else {
        console.log("[FAIL] Repair failed");
        process.exitCode = 1;
        return;
      }
    } catch (error) {
      console.log("[FAIL] Repair request:", error.message);
      process.exitCode = 1;
      return;
    }
  }

  console.log("");
  console.log("[6] VERIFY");

  const distDir = path.join(generatedDir, "dist");

  if (!fs.existsSync(distDir)) {
    console.log("[FAIL] Production dist directory missing.");
    process.exitCode = 1;
    return;
  }

  const distIndex = path.join(distDir, "index.html");

  if (!fs.existsSync(distIndex)) {
    console.log("[FAIL] Production index.html missing.");
    process.exitCode = 1;
    return;
  }

  console.log("[PASS] Production output verified");

  console.log("");
  console.log("[7] CHECKPOINT");

  const finalReport = {
    status: "COMPLETE",
    completedAt: new Date().toISOString(),
    prompt,
    architecture: plan.classification,
    generated: true,
    productionBuild: "PASS",
    productionOutput: distDir,
    verified: true
  };

  const reportFile = path.join(
    executionDir,
    "final-report.json"
  );

  fs.writeFileSync(
    reportFile,
    JSON.stringify(finalReport, null, 2),
    "utf8"
  );

  console.log("[PASS] Final report:", reportFile);

  console.log("");
  console.log("==================================================");
  console.log(" SIMEONJR AUTONOMOUS BUILD: COMPLETE");
  console.log("==================================================");
  console.log("Generation : PASS");
  console.log("Build      : PASS");
  console.log("Verification: PASS");
  console.log("Status     : COMPLETE");
  console.log("==================================================");
}

executeFactory().catch(error => {
  console.error("");
  console.error("[FATAL]", error.message);
  process.exitCode = 1;
});
`;

runner =
  runner.slice(0, runner.indexOf(marker) + marker.length) +
  executionCode +
  runner.slice(runner.indexOf(marker) + marker.length);

fs.writeFileSync(runnerPath, runner, "utf8");

console.log("");
console.log("==================================================");
console.log(" SIMEONJR EXECUTION LOOP INSTALLATION");
console.log("==================================================");
console.log("[PASS] GENERATE stage connected");
console.log("[PASS] BUILD stage connected");
console.log("[PASS] TEST/verification stage connected");
console.log("[PASS] REPAIR path connected");
console.log("[PASS] REBUILD path connected");
console.log("[PASS] FINAL CHECKPOINT connected");
console.log("");
console.log("[1] Syntax verification");

cp.execFileSync(
  process.execPath,
  ["--check", runnerPath],
  { stdio: "inherit" }
);

console.log("[PASS] Runner syntax");
console.log("");
console.log("==================================================");
console.log(" EXECUTION LOOP V1: READY");
console.log("==================================================");
