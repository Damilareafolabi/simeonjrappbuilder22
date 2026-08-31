import fs from "fs";
import path from "path";
import { exec } from "child_process";

const WORKSPACE = path.resolve(process.cwd());

const ACTIVE_FILES = [
  "src/App.jsx",
  "src/App.css",
  "src/index.css",
  "src/main.jsx",
  "backend/server.js",
  "vite.config.js",
  "index.html"
];

const PROTECTED_ROOTS = [
  ".factory",
  "node_modules",
  "dist",
  "src-before-v2",
  "generated",
  "projects",
  ".git"
];

function normalize(p) {
  return String(p || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function isProtected(file) {
  const p = normalize(file);
  return PROTECTED_ROOTS.some(root => p === root || p.startsWith(root + "/"));
}

function isAllowed(file) {
  return ACTIVE_FILES.includes(normalize(file)) && !isProtected(file);
}

function absolute(file) {
  const target = path.resolve(WORKSPACE, file);
  if (target !== WORKSPACE && !target.startsWith(WORKSPACE + path.sep)) {
    throw new Error("Path outside workspace rejected");
  }
  return target;
}

function backup(files) {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const root = path.join(WORKSPACE, ".factory", "backups", "transform-2.4", stamp);
  fs.mkdirSync(root, { recursive: true });

  for (const file of files) {
    if (!isAllowed(file)) continue;
    const source = absolute(file);
    if (!fs.existsSync(source)) continue;

    const target = path.join(root, normalize(file));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }

  fs.writeFileSync(
    path.join(root, "manifest.json"),
    JSON.stringify({ phase: "2.4", files }, null, 2)
  );

  return root;
}

function rollback(root, files) {
  for (const file of files) {
    const source = path.join(root, normalize(file));
    const target = absolute(file);

    if (fs.existsSync(source)) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);
    }
  }
}

function parseFiles(text) {
  const result = {};
  const regex = /===FILE:\s*([^\r\n=]+?)===\r?\n([\s\S]*?)(?=\r?\n===FILE:|$)/g;

  let match;

  while ((match = regex.exec(String(text || ""))) !== null) {
    const file = normalize(match[1].trim());

    if (!isAllowed(file)) continue;

    result[file] = match[2]
      .replace(/^```[a-zA-Z0-9_-]*\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }

  return result;
}

function runBuild() {
  return new Promise(resolve => {
    exec(
      process.platform === "win32" ? "npm.cmd run build" : "npm run build",
      {
        cwd: WORKSPACE,
        windowsHide: true,
        maxBuffer: 20 * 1024 * 1024,
        timeout: 180000
      },
      (error, stdout, stderr) => {
        resolve({
          success: !error,
          stdout: stdout || "",
          stderr: stderr || "",
          exitCode: error?.code ?? 0
        });
      }
    );
  });
}

export function getTransformClassification() {
  return {
    phase: "2.4",
    activeFiles: ACTIVE_FILES,
    protectedRoots: PROTECTED_ROOTS,
    files: ACTIVE_FILES.map(file => ({
      path: file,
      active: true,
      protected: false,
      exists: fs.existsSync(absolute(file))
    }))
  };
}

export async function transformExisting({ prompt, lmChat }) {
  if (!prompt || typeof prompt !== "string") {
    throw new Error("Transformation prompt is required");
  }

  const targets = ACTIVE_FILES.filter(
    file => fs.existsSync(absolute(file)) && isAllowed(file)
  );

  console.log("");
  console.log("========================================");
  console.log(" SIMEONJR TRANSFORMATION ENGINE 2.4");
  console.log("========================================");
  console.log("");
  console.log("[1/7] Loading project analysis...");
  console.log(`✓ ${targets.length} active files available`);

  const source = {};

  for (const file of targets) {
    source[file] = fs.readFileSync(absolute(file), "utf8");
  }

  console.log("[2/7] Understanding transformation request...");
  console.log("→ Qwen analyzing existing application...");

  const current = targets.map(
    file => `===CURRENT FILE: ${file}===\n${source[file]}`
  ).join("\n\n");

  const result = await lmChat({
    message: `
TRANSFORMATION REQUEST:

${prompt}

EXISTING APPLICATION:

${current}

Analyze the existing application and improve it.

Do NOT rebuild from scratch.

Return ONLY files that genuinely need modification.

Use exactly:

===FILE: path/to/file===
complete file contents

Never return protected files.
`,
    system: `
You are SimeonJr's autonomous existing-application transformation engineer.

Preserve existing functionality.
Improve the current application.
Do not rebuild from scratch.

Allowed files:
${targets.join("\n")}

Protected:
${PROTECTED_ROOTS.join("\n")}

No markdown.
No explanations.
No code fences.
`,
    temperature: 0.05,
    max_tokens: 12000
  });

  const modifications = parseFiles(result.content);

  if (!Object.keys(modifications).length) {
    throw new Error("Qwen returned no valid modifications");
  }

  console.log("[3/7] Transformation plan");

  for (const file of Object.keys(modifications)) {
    console.log(`→ ${file}`);
  }

  console.log("[4/7] Creating safety backup...");

  const files = Object.keys(modifications);
  const backupRoot = backup(files);

  console.log(`✓ Backup complete: ${backupRoot}`);

  console.log("[5/7] TRANSFORMING");
  console.log("----------------------------------------");

  try {
    for (const [file, content] of Object.entries(modifications)) {
      if (!isAllowed(file)) {
        throw new Error(`Unsafe modification rejected: ${file}`);
      }

      console.log(`→ Reading ${file}`);
      console.log("→ AI generating modification");
      console.log(`→ Writing ${file}`);

      fs.mkdirSync(path.dirname(absolute(file)), { recursive: true });
      fs.writeFileSync(absolute(file), content, "utf8");

      console.log("✓ COMPLETE");
    }

    console.log("[6/7] BUILDING");
    console.log("----------------------------------------");

    let build = await runBuild();
    let repairs = 0;

    while (!build.success && repairs < 3) {
      repairs++;

      console.log(`✗ BUILD FAILED - repair ${repairs}/3`);

      const repair = await lmChat({
        message: `
The transformation failed to build.

REQUEST:
${prompt}

BUILD ERROR:
${build.stderr}

BUILD OUTPUT:
${build.stdout}

Affected files:
${files.join("\n")}

Return corrected ACTIVE files only using:

===FILE: path===
complete contents

Do not modify protected paths.
`,
        system: "You are a React/Vite debugging engineer. Return only corrected files.",
        temperature: 0.02,
        max_tokens: 12000
      });

      const repaired = parseFiles(repair.content);

      for (const [file, content] of Object.entries(repaired)) {
        if (isAllowed(file)) {
          fs.writeFileSync(absolute(file), content, "utf8");
        }
      }

      build = await runBuild();
    }

    if (!build.success) {
      console.log("✗ BUILD FAILED");
      console.log("→ Starting automatic rollback");

      rollback(backupRoot, files);

      console.log("✓ Rollback complete");
      console.log("✓ Original application preserved");

      return {
        ok: false,
        phase: "2.4",
        rolledBack: true,
        modified: files,
        repairs,
        backup: backupRoot,
        build
      };
    }

    console.log("✓ Production build PASSED");
    console.log("[7/7] VERIFYING");

    const verify = await runBuild();

    if (!verify.success) {
      rollback(backupRoot, files);

      return {
        ok: false,
        phase: "2.4",
        rolledBack: true,
        error: "Final verification failed",
        backup: backupRoot
      };
    }

    console.log("✓ Files verified");
    console.log("✓ Application still builds");
    console.log("✓ Transformation successful");

    return {
      ok: true,
      phase: "2.4",
      modified: files,
      repairs,
      backup: backupRoot,
      build: verify,
      model: result.model
    };

  } catch (error) {
    rollback(backupRoot, files);

    return {
      ok: false,
      phase: "2.4",
      rolledBack: true,
      error: error.message,
      backup: backupRoot
    };
  }
}
