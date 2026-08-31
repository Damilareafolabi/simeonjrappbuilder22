import fs from "fs";
import path from "path";
import { exec } from "child_process";

const WORKSPACE = path.resolve(process.cwd());

const PROTECTED_ROOTS = [
  ".factory",
  "node_modules",
  "dist",
  ".git",
  "generated",
  "projects"
];

const MAX_FILE_SIZE = 512 * 1024;
const MAX_FILES = 300;

function normalize(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
}

function isProtected(file) {
  const p = normalize(file);

  return PROTECTED_ROOTS.some(
    root => p === root || p.startsWith(root + "/")
  );
}

function safePath(root, relative) {
  const target = path.resolve(root, relative);

  if (
    target !== root &&
    !target.startsWith(root + path.sep)
  ) {
    throw new Error("Path outside project rejected");
  }

  return target;
}

function discoverFiles(root) {
  const results = [];

  function walk(dir) {
    if (results.length >= MAX_FILES) return;

    if (!fs.existsSync(dir)) return;

    for (const entry of fs.readdirSync(dir, {
      withFileTypes: true
    })) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".git" ||
        entry.name === "dist" ||
        entry.name === ".factory"
      ) {
        continue;
      }

      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(full);
        continue;
      }

      const relative = normalize(
        path.relative(root, full)
      );

      if (isProtected(relative)) continue;

      try {
        const stat = fs.statSync(full);

        if (stat.size > MAX_FILE_SIZE) continue;

        results.push(relative);
      } catch {
        continue;
      }
    }
  }

  walk(root);

  return results;
}

function readProject(root) {
  const files = discoverFiles(root);
  const source = {};

  for (const file of files) {
    try {
      source[file] = fs.readFileSync(
        safePath(root, file),
        "utf8"
      );
    } catch {
      // Ignore binary/unreadable files.
    }
  }

  return {
    files,
    source
  };
}

function parseFiles(text, allowedFiles) {
  const result = {};

  const regex =
    /===FILE:\s*([^\r\n=]+?)===\r?\n([\s\S]*?)(?=\r?\n===FILE:|$)/g;

  let match;

  while ((match = regex.exec(String(text || ""))) !== null) {
    const file = normalize(match[1].trim());

    if (!file) continue;
    if (isProtected(file)) continue;

    if (
      allowedFiles &&
      allowedFiles.length &&
      !allowedFiles.includes(file)
    ) {
      continue;
    }

    result[file] = match[2]
      .replace(/^```[a-zA-Z0-9_-]*\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }

  return result;
}

function backupProject(root, files) {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);

  const backupRoot = path.join(
    WORKSPACE,
    ".factory",
    "backups",
    "projects",
    stamp
  );

  fs.mkdirSync(backupRoot, {
    recursive: true
  });

  for (const file of files) {
    if (isProtected(file)) continue;

    const source = safePath(root, file);

    if (!fs.existsSync(source)) continue;

    const destination = path.join(
      backupRoot,
      file
    );

    fs.mkdirSync(
      path.dirname(destination),
      { recursive: true }
    );

    fs.copyFileSync(source, destination);
  }

  fs.writeFileSync(
    path.join(backupRoot, "manifest.json"),
    JSON.stringify(
      {
        phase: "2.4B",
        projectRoot: root,
        files
      },
      null,
      2
    )
  );

  return backupRoot;
}

function rollbackProject(root, backupRoot, files) {
  for (const file of files) {
    if (isProtected(file)) continue;

    const source = path.join(
      backupRoot,
      file
    );

    const destination = safePath(
      root,
      file
    );

    if (!fs.existsSync(source)) continue;

    fs.mkdirSync(
      path.dirname(destination),
      { recursive: true }
    );

    fs.copyFileSync(
      source,
      destination
    );
  }
}

function runCommand(command, cwd, timeout = 180000) {
  return new Promise(resolve => {
    exec(
      command,
      {
        cwd,
        windowsHide: true,
        maxBuffer: 30 * 1024 * 1024,
        timeout
      },
      (error, stdout, stderr) => {
        resolve({
          success: !error,
          exitCode: error?.code ?? 0,
          stdout: stdout || "",
          stderr: stderr || ""
        });
      }
    );
  });
}

async function buildProject(root) {
  const packageJson = path.join(
    root,
    "package.json"
  );

  if (!fs.existsSync(packageJson)) {
    return {
      success: false,
      reason: "No package.json found",
      stdout: "",
      stderr: ""
    };
  }

  let packageData;

  try {
    packageData = JSON.parse(
      fs.readFileSync(packageJson, "utf8")
    );
  } catch {
    return {
      success: false,
      reason: "Invalid package.json",
      stdout: "",
      stderr: ""
    };
  }

  if (
    packageData.scripts &&
    packageData.scripts.build
  ) {
    const install = await runCommand(
      process.platform === "win32"
        ? "npm.cmd install"
        : "npm install",
      root,
      300000
    );

    if (!install.success) {
      return {
        success: false,
        stage: "npm_install",
        ...install
      };
    }

    return await runCommand(
      process.platform === "win32"
        ? "npm.cmd run build"
        : "npm run build",
      root,
      300000
    );
  }

  return {
    success: true,
    stage: "no-build-script"
  };
}

export function getTransformClassification() {
  return {
    phase: "2.4B",
    mode: "isolated-project-transform",
    protectedRoots: PROTECTED_ROOTS,
    maxFiles: MAX_FILES,
    maxFileSize: MAX_FILE_SIZE
  };
}

export async function transformProject({
  projectRoot,
  prompt,
  lmChat
}) {
  if (!projectRoot) {
    throw new Error("projectRoot is required");
  }

  if (!prompt || typeof prompt !== "string") {
    throw new Error("Transformation prompt is required");
  }

  const root = path.resolve(projectRoot);

  if (
    root === WORKSPACE ||
    root.startsWith(WORKSPACE + path.sep + "src") ||
    root.startsWith(WORKSPACE + path.sep + "backend")
  ) {
    throw new Error(
      "Factory source workspace cannot be transformed through project import"
    );
  }

  if (!fs.existsSync(root)) {
    throw new Error("Imported project does not exist");
  }

  console.log("");
  console.log("========================================");
  console.log(" SIMEONJR PROJECT TRANSFORMATION 2.4B");
  console.log("========================================");

  console.log("[1/7] Reading imported project...");

  const project = readProject(root);

  console.log(
    `✓ ${project.files.length} project files discovered`
  );

  if (!project.files.length) {
    throw new Error(
      "No readable project files found"
    );
  }

  console.log("[2/7] Sending project to local AI...");

  const current = project.files
    .map(
      file =>
        `===CURRENT FILE: ${file}===\n${project.source[file]}`
    )
    .join("\n\n");

  const result = await lmChat({
    message: `
TRANSFORMATION REQUEST:

${prompt}

EXISTING PROJECT:

${current}

Analyze this existing application.

DO NOT rebuild the project from scratch.

Preserve existing functionality.

Only modify files that genuinely need modification.

Return ONLY modified files.

Use exactly:

===FILE: relative/path.ext===
complete file contents

Never modify:
${PROTECTED_ROOTS.join("\n")}
`,
    system: `
You are SimeonJr's autonomous existing-application transformation engineer.

Your job is to upgrade an existing software project.

Preserve functionality.
Do not rebuild unnecessarily.
Do not invent unrelated features.
Do not modify protected directories.
Return complete contents for modified files only.

No markdown.
No explanations.
No code fences.
`,
    temperature: 0.05,
    max_tokens: 16000
  });

  const modifications = parseFiles(
    result.content,
    project.files
  );

  if (!Object.keys(modifications).length) {
    throw new Error(
      "AI returned no valid project modifications"
    );
  }

  console.log("[3/7] Creating project backup...");

  const backupRoot = backupProject(
    root,
    Object.keys(modifications)
  );

  console.log(
    `✓ Backup: ${backupRoot}`
  );

  console.log("[4/7] Applying safe modifications...");

  try {
    for (
      const [file, content]
      of Object.entries(modifications)
    ) {
      if (isProtected(file)) {
        throw new Error(
          `Protected path rejected: ${file}`
        );
      }

      const target = safePath(root, file);

      fs.mkdirSync(
        path.dirname(target),
        { recursive: true }
      );

      fs.writeFileSync(
        target,
        content,
        "utf8"
      );

      console.log(`✓ Modified ${file}`);
    }

    console.log("[5/7] Building transformed project...");

    let build = await buildProject(root);

    let repairs = 0;

    while (
      !build.success &&
      repairs < 3
    ) {
      repairs++;

      console.log(
        `✗ Build failed - AI repair ${repairs}/3`
      );

      const repair = await lmChat({
        message: `
The transformed project failed to build.

ORIGINAL REQUEST:
${prompt}

BUILD ERROR:
${build.stderr || build.reason || ""}

BUILD OUTPUT:
${build.stdout || ""}

Repair the existing project.

Return ONLY corrected files.

Use:
===FILE: path===
complete file contents
`,
        system: `
You are SimeonJr's autonomous software repair engineer.

Repair the existing application.
Do not rebuild it from scratch.
Return only necessary corrected files.
Never modify protected directories.
No markdown.
No explanations.
`,
        temperature: 0.02,
        max_tokens: 16000
      });

      const repaired = parseFiles(
        repair.content,
        project.files
      );

      for (
        const [file, content]
        of Object.entries(repaired)
      ) {
        if (isProtected(file)) continue;

        const target = safePath(root, file);

        fs.mkdirSync(
          path.dirname(target),
          { recursive: true }
        );

        fs.writeFileSync(
          target,
          content,
          "utf8"
        );
      }

      build = await buildProject(root);
    }

    if (!build.success) {
      console.log(
        "✗ Build failed after repair attempts"
      );

      console.log(
        "→ Rolling project back..."
      );

      rollbackProject(
        root,
        backupRoot,
        Object.keys(modifications)
      );

      return {
        ok: false,
        phase: "2.4B",
        rolledBack: true,
        modified: Object.keys(modifications),
        repairs,
        backup: backupRoot,
        build
      };
    }

    console.log("[6/7] Final verification...");

    const verification =
      await buildProject(root);

    if (!verification.success) {
      rollbackProject(
        root,
        backupRoot,
        Object.keys(modifications)
      );

      return {
        ok: false,
        phase: "2.4B",
        rolledBack: true,
        error:
          "Final project verification failed",
        backup: backupRoot
      };
    }

    console.log("[7/7] TRANSFORMATION COMPLETE");

    return {
      ok: true,
      phase: "2.4B",
      projectRoot: root,
      modified: Object.keys(modifications),
      repairs,
      backup: backupRoot,
      build: verification,
      model: result.model
    };

  } catch (error) {
    rollbackProject(
      root,
      backupRoot,
      Object.keys(modifications)
    );

    return {
      ok: false,
      phase: "2.4B",
      rolledBack: true,
      error: error.message,
      backup: backupRoot
    };
  }
}

export async function transformExisting({
  projectRoot,
  prompt,
  lmChat
}) {
  return transformProject({
    projectRoot,
    prompt,
    lmChat
  });
}
