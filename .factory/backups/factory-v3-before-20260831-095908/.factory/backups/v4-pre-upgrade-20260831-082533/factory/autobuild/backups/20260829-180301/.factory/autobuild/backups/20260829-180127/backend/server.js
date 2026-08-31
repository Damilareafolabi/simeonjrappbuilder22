import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKSPACE = path.resolve(__dirname, "..");
const GENERATED = path.join(WORKSPACE, "generated");

const PORT = 8787;
const LM_STUDIO_URL = "http://127.0.0.1:1234";
const LM_MODEL = "qwen2.5-coder-1.5b-instruct";

const app = express();

app.use(cors());
app.use(express.json({ limit: "6mb" }));

function safeGeneratedPath(relativePath) {
  const target = path.resolve(GENERATED, relativePath);

  if (
    target !== GENERATED &&
    !target.startsWith(GENERATED + path.sep)
  ) {
    throw new Error("Path outside generated workspace is not allowed");
  }

  return target;
}

function walk(dir, results = []) {
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === "node_modules" ||
      entry.name === ".git" ||
      entry.name === "dist"
    ) {
      continue;
    }

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full, results);
    } else {
      results.push(path.relative(dir, full));
    }
  }

  return results;
}

async function lmChat({
  message,
  system,
  temperature = 0.1,
  max_tokens = 4000
}) {
  const response = await fetch(
    `${LM_STUDIO_URL}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: LM_MODEL,
        messages: [
          {
            role: "system",
            content: system
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature,
        max_tokens
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
      `LM Studio returned HTTP ${response.status}`
    );
  }

  return {
    content: data?.choices?.[0]?.message?.content || "",
    model: data?.model || LM_MODEL,
    usage: data?.usage || null
  };
}

function cleanCode(text) {
  let value = String(text || "").trim();

  value = value
    .replace(/^```(?:jsx|js|javascript|css|html|tsx|ts|typescript)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return value;
}

function parseFiles(text) {
  const files = {};

  const pattern =
    /===FILE:\s*([^\r\n=]+?)===\r?\n([\s\S]*?)(?=\r?\n===FILE:|$)/g;

  let match;

  while ((match = pattern.exec(text)) !== null) {
    const fileName = match[1].trim();
    const content = cleanCode(match[2]);

    if (fileName && content) {
      files[fileName] = content;
    }
  }

  return files;
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    name: "SimeonJr Agent",
    workspace: WORKSPACE,
    generated: GENERATED
  });
});

app.get("/api/files", (_req, res) => {
  try {
    res.json({
      ok: true,
      files: walk(WORKSPACE)
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

app.get("/api/generated/files", (_req, res) => {
  try {
    res.json({
      ok: true,
      files: walk(GENERATED)
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

app.get("/api/ai/status", async (_req, res) => {
  try {
    const response = await fetch(
      `${LM_STUDIO_URL}/v1/models`
    );

    if (!response.ok) {
      throw new Error(
        `LM Studio returned HTTP ${response.status}`
      );
    }

    const data = await response.json();

    res.json({
      ok: true,
      connected: true,
      server: LM_STUDIO_URL,
      model: LM_MODEL,
      models: data?.data || []
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      connected: false,
      server: LM_STUDIO_URL,
      model: LM_MODEL,
      error: error.message
    });
  }
});

app.post("/api/ai/chat", async (req, res) => {
  try {
    const {
      message,
      system,
      temperature,
      max_tokens
    } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        ok: false,
        error: "message is required"
      });
    }

    const result = await lmChat({
      message,
      system:
        system ||
        "You are SimeonJr Agent, a local coding assistant.",
      temperature:
        typeof temperature === "number"
          ? temperature
          : 0.2,
      max_tokens:
        typeof max_tokens === "number"
          ? max_tokens
          : 2000
    });

    res.json({
      ok: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/*
========================================================
REAL SIMEONJR BUILD ENGINE
========================================================

Qwen returns:

===FILE: index.html===
...

===FILE: src/App.jsx===
...

===FILE: src/App.css===
...

===FILE: src/main.jsx===
...

This is intentionally simpler than JSON so smaller
local coding models can reliably produce projects.
*/

function repairGeneratedFiles(files) {
  for (const file of Object.keys(files)) {
    let content = String(files[file] || "");

    // Remove markdown fences accidentally produced by the model.
    content = content.replace(/```[a-zA-Z0-9_-]*/g, "");
    content = content.replace(/```/g, "");

    files[file] = content.trim();
  }

  // Repair Vite HTML entry.
  if (files["index.html"]) {
    files["index.html"] = files["index.html"]
      .replace(
        /<script\s+src=["']([^"']+)["']\s*><\/script>/gi,
        '<script type="module" src="$1"></script>'
      );
  }

  // Repair React entry point.
  if (files["src/main.jsx"]) {
    files["src/main.jsx"] = files["src/main.jsx"]
      .replace(
        /ReactDOM\.render\s*\(\s*<App\s*\/>\s*,\s*document\.getElementById\(["']root["']\)\s*\)\s*;?/g,
        'ReactDOM.createRoot(document.getElementById("root")).render(<App />);'
      )
      .replace(
        /import\s+ReactDOM\s+from\s+["']react-dom["'];?/g,
        'import ReactDOM from "react-dom/client";'
      );
  }

  return files;
}

function runGeneratedBuild() {
  return new Promise((resolve) => {
    exec(
      process.platform === "win32"
        ? "npm.cmd run build"
        : "npm run build",
      {
        cwd: GENERATED,
        windowsHide: true,
        maxBuffer: 20 * 1024 * 1024,
        timeout: 120000
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

async function installGeneratedDependencies() {
  return new Promise((resolve) => {
    exec(
      process.platform === "win32"
        ? "npm.cmd install"
        : "npm install",
      {
        cwd: GENERATED,
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

function writeGeneratedFiles(files) {
  const written = [];

  for (const [relativePath, content] of Object.entries(files)) {
    const target = safeGeneratedPath(relativePath);

    fs.mkdirSync(path.dirname(target), {
      recursive: true
    });

    fs.writeFileSync(
      target,
      content,
      "utf8"
    );

    written.push(relativePath);
  }

  return written;
}

async function repairGeneratedBuild(buildResult, originalPrompt) {
  const repairSystem = `
You are SimeonJr's autonomous debugging engineer.

A React/Vite application was generated but its production build failed.

Your job is to repair the application.

DO NOT explain anything.
DO NOT use markdown.
DO NOT use code fences.
Return ONLY files that need to be changed using this exact format:

===FILE: path/to/file===
file contents

The application must remain a React/Vite application.

Fix the actual build error.
Do not remove existing functionality unless necessary.
`;

  const repairPrompt = `
Original application request:

${originalPrompt}

The production build failed.

BUILD STDOUT:
${buildResult.stdout}

BUILD STDERR:
${buildResult.stderr}

Return the corrected files only.
`;

  const result = await lmChat({
    message: repairPrompt,
    system: repairSystem,
    temperature: 0.05,
    max_tokens: 6000
  });

  const files = parseFiles(result.content);

  if (!Object.keys(files).length) {
    return {
      ok: false,
      error: "AI debugger returned no repair files",
      raw: result.content
    };
  }

  const repaired = repairGeneratedFiles(files);
  const written = writeGeneratedFiles(repaired);

  return {
    ok: true,
    model: result.model,
    files: written
  };
}

app.post("/api/ai/build", async (req, res) => {
  const prompt = req.body?.prompt;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({
      ok: false,
      error: "prompt is required"
    });
  }

  try {
    fs.mkdirSync(GENERATED, {
      recursive: true
    });

    const system = `
You are SimeonJr App Builder, a local autonomous React coding engine.

Create a complete small React application.

IMPORTANT:
DO NOT RETURN JSON.
DO NOT USE MARKDOWN.
DO NOT USE CODE FENCES.
DO NOT EXPLAIN ANYTHING.

Return files using EXACTLY this format:

===FILE: index.html===
file contents

===FILE: src/App.jsx===
file contents

===FILE: src/App.css===
file contents

===FILE: src/main.jsx===
file contents

Rules:

1. Generate valid React JSX.
2. Generate valid CSS.
3. Generate valid HTML.
4. Use React 18+ createRoot syntax.
5. Do not use ReactDOM.render.
6. Do not use TypeScript.
7. Do not require external packages.
8. Do not use external APIs.
9. Do not use markdown.
10. The generated app must run with Vite.
11. Keep the implementation simple and complete.
12. Put each file in its own ===FILE: path=== section.
`;

    const result = await lmChat({
      message: `
Build this application:

${prompt}

Return the complete application using the required FILE format.
`,
      system,
      temperature: 0.05,
      max_tokens: 5000
    });

    const files = parseFiles(result.content);

    const repairedFiles = repairGeneratedFiles(files);

    const required = [
      "index.html",
      "src/App.jsx",
      "src/App.css",
      "src/main.jsx"
    ];

    const missing = required.filter(
      file => !repairedFiles[file]
    );

    if (missing.length) {
      return res.status(500).json({
        ok: false,
        error: "Qwen did not generate all required files",
        missing,
        model: result.model,
        raw: result.content
      });
    }

    const writtenFiles = [];

    for (const [relativePath, content] of Object.entries(repairedFiles)) {
      const target = safeGeneratedPath(relativePath);

      fs.mkdirSync(path.dirname(target), {
        recursive: true
      });

      fs.writeFileSync(
        target,
        content,
        "utf8"
      );

      writtenFiles.push(relativePath);
    }

    console.log("");
    console.log("======================================");
    console.log("   SIMEONJR AUTONOMOUS BUILD");
    console.log("======================================");
    console.log(`Generated files: ${writtenFiles.length}`);

    // Make sure dependencies are available.
    const installResult = await installGeneratedDependencies();

    if (!installResult.success) {
      return res.status(500).json({
        ok: false,
        stage: "npm_install",
        error: "Generated project dependencies could not be installed",
        stdout: installResult.stdout,
        stderr: installResult.stderr,
        files: writtenFiles
      });
    }

    let buildResult = await runGeneratedBuild();
    let repairAttempts = 0;
    const repairHistory = [];

    while (!buildResult.success && repairAttempts < 3) {
      repairAttempts++;

      console.log(
        `Build failed. Starting AI repair attempt ${repairAttempts}/3...`
      );

      const repair = await repairGeneratedBuild(
        buildResult,
        prompt
      );

      repairHistory.push(repair);

      if (!repair.ok) {
        break;
      }

      buildResult = await runGeneratedBuild();
    }

    if (!buildResult.success) {
      return res.status(500).json({
        ok: false,
        stage: "build",
        model: result.model,
        prompt,
        files: writtenFiles,
        repairAttempts,
        repairHistory,
        build: buildResult,
        preview: false
      });
    }

    const indexFile = path.join(
      GENERATED_DIST,
      "index.html"
    );

    if (!fs.existsSync(indexFile)) {
      return res.status(500).json({
        ok: false,
        stage: "preview-verification",
        error: "Build completed but dist/index.html was not created",
        files: writtenFiles,
        repairAttempts,
        build: buildResult
      });
    }

    res.json({
      ok: true,
      model: result.model,
      prompt,
      files: writtenFiles,
      generatedWorkspace: GENERATED,
      build: {
        success: true,
        repairAttempts,
        stdout: buildResult.stdout,
        stderr: buildResult.stderr
      },
      preview: {
        ready: true,
        url: "/preview"
      }
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/* =========================================
   LIVE GENERATED APP PREVIEW
   ========================================= */

const GENERATED_DIST = path.join(GENERATED, "dist");

app.use("/preview/assets", express.static(path.join(GENERATED_DIST, "assets")));
app.use("/assets", express.static(path.join(GENERATED_DIST, "assets")));

app.get("/preview", (_req, res) => {
  const indexFile = path.join(GENERATED_DIST, "index.html");

  if (!fs.existsSync(indexFile)) {
    return res.status(404).send(`
      <!doctype html>
      <html>
        <body style="font-family:system-ui;padding:40px">
          <h2>No preview available</h2>
          <p>Build an application first.</p>
        </body>
      </html>
    `);
  }

  res.sendFile(indexFile);
});

/* =========================================
   COMMAND EXECUTION
   ========================================= */

app.post("/api/run", (req, res) => {
  const command = req.body?.command;

  if (!command || typeof command !== "string") {
    return res.status(400).json({
      ok: false,
      error: "command is required"
    });
  }

  exec(
    command,
    {
      cwd: WORKSPACE,
      windowsHide: true,
      maxBuffer: 20 * 1024 * 1024
    },
    (error, stdout, stderr) => {
      res.json({
        ok: !error,
        command,
        stdout,
        stderr,
        exitCode: error?.code ?? 0
      });
    }
  );
});

fs.mkdirSync(GENERATED, {
  recursive: true
});

app.listen(PORT, "127.0.0.1", () => {
  console.log("");
  console.log("======================================");
  console.log("   SIMEONJR AGENT SERVER");
  console.log("======================================");
  console.log(`Workspace:  ${WORKSPACE}`);
  console.log(`Generated:  ${GENERATED}`);
  console.log(`API:        http://127.0.0.1:${PORT}`);
  console.log(`LM Studio:  ${LM_STUDIO_URL}`);
  console.log(`AI Model:   ${LM_MODEL}`);
  console.log("");
});





