import { useState } from "react";
import "./App.css";

const examples = [
  "Create a professional inventory management system",
  "Create a CRM with customers, contacts and sales",
  "Create an employee task management dashboard",
  "Create an invoice generator",
];

function App() {
  const [mode, setMode] = useState("build");
  const [prompt, setPrompt] = useState("");
  const [building, setBuilding] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [previewKey, setPreviewKey] = useState(Date.now());
  const [importedFiles, setImportedFiles] = useState([]);

  const [logs, setLogs] = useState([
    "Workspace initialized",
    "Backend connected",
    "Local Qwen connected",
  ]);

  async function buildApp() {
    if (!prompt.trim() || building) return;

    setBuilding(true);
    setError("");
    setFiles([]);
    setStatus(mode === "build" ? "Planning..." : "Analyzing project...");

    setLogs([
      "Workspace initialized",
      "Backend connected",
      "Local Qwen connected",
      mode === "build"
        ? "→ Build from scratch mode selected"
        : "→ Transform existing project mode selected",
    ]);

    try {
      /*
       * BUILD MODE
       *
       * Uses the existing proven AI build endpoint.
       */
      if (mode === "build") {
        setStatus("Building...");
        setLogs((x) => [
          ...x,
          "→ Sending requirements to local coding agent",
        ]);

        const response = await fetch(
          "http://127.0.0.1:8787/api/ai/build",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              prompt,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Build failed");
        }

        setStatus("Testing...");
        setLogs((x) => [
          ...x,
          "✓ Application files generated",
          ...(data.files || []).map((file) => `✓ ${file}`),
          "✓ Production build completed",
          "✓ Preparing live preview",
        ]);

        setFiles(data.files || []);

        setTimeout(() => {
          setPreviewKey(Date.now());
          setStatus("Build Complete");
          setLogs((x) => [...x, "✓ LIVE PREVIEW READY"]);
        }, 500);

        return;
      }

      /*
       * TRANSFORM MODE
       *
       * The project import UI is now active.
       * The backend transformation pipeline will be connected
       * in the next stage.
       */
      if (mode === "transform") {
        setStatus("Transform Mode Ready");

        setLogs((x) => [
          ...x,
          "✓ Existing project detected",
          `✓ ${importedFiles.length} imported file(s)`,
          "→ Transformation planning ready",
        ]);

        if (importedFiles.length === 0) {
          setStatus("Waiting for Project");
          setError(
            "Drop an existing project or select project files first."
          );
          return;
        }

        setStatus("Transformation Planned");

        setLogs((x) => [
          ...x,
          "✓ Project structure captured",
          "✓ Transformation request prepared",
          "→ Backend transformation engine will process the project",
        ]);
      }
    } catch (err) {
      setError(err.message);
      setStatus("Build Failed");
      setLogs((x) => [...x, `✗ ${err.message}`]);
    } finally {
      setBuilding(false);
    }
  }

  function handleProjectDrop(event) {
    event.preventDefault();

    const dropped = Array.from(event.dataTransfer.files || []);

    if (!dropped.length) return;

    setImportedFiles(dropped);
    setError("");
    setStatus("Project Imported");

    setLogs((x) => [
      ...x,
      `✓ ${dropped.length} file(s) added`,
      "✓ Ready to analyze existing project",
    ]);
  }

  function handleFileSelect(event) {
    const selected = Array.from(event.target.files || []);

    if (!selected.length) return;

    setImportedFiles(selected);
    setError("");
    setStatus("Project Imported");

    setLogs((x) => [
      ...x,
      `✓ ${selected.length} file(s) selected`,
      "✓ Ready to analyze existing project",
    ]);
  }

  function refreshPreview() {
    setPreviewKey(Date.now());
  }

  function openPreview() {
    window.open(
      `http://127.0.0.1:8787/preview?t=${Date.now()}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function fullscreenPreview() {
    const frame = document.getElementById("livePreviewFrame");

    if (frame?.requestFullscreen) {
      frame.requestFullscreen();
    }
  }

  function newApp() {
    setPrompt("");
    setFiles([]);
    setImportedFiles([]);
    setError("");
    setStatus("Ready");
    setPreviewKey(Date.now());

    setLogs([
      "Workspace initialized",
      "Backend connected",
      "Local Qwen connected",
    ]);
  }

  return (
    <div className="factory">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">SJ</div>
          <div>
            <strong>App Factory</strong>
            <span>AI Development Platform</span>
          </div>
        </div>

        <button className="newApp" onClick={newApp}>
          <span>＋</span>
          New App
        </button>

        <nav>
          <div className="navSection">FACTORY</div>

          <a className="active">
            <span>⌘</span>
            Build
          </a>

          <a>
            <span>◈</span>
            Projects
          </a>

          <a>
            <span>▣</span>
            Templates
          </a>

          <a>
            <span>◫</span>
            Files
          </a>
        </nav>

        <div className="sidebarBottom">
          <div className="localAI">
            <span className="dot" />

            <div>
              <strong>AI Engine</strong>
              <small>Connected</small>
            </div>

            <span className="onlineText">ONLINE</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">AI APP FACTORY</span>
            <h1>Idea in. App out.</h1>
          </div>

          <div className="connection">
            <span className="dot" />
            AI ENGINE CONNECTED
          </div>
        </header>

        <section className="hero">
          <div className="heroBadge">
            <span>✦</span>
            AI-POWERED APP DEVELOPMENT
          </div>

          <div className="modeSwitcher">
            <button
              className={mode === "build" ? "mode activeMode" : "mode"}
              onClick={() => {
                setMode("build");
                setError("");
                setStatus("Ready");
              }}
              disabled={building}
            >
              <strong>Build From Scratch</strong>
              <small>Turn an idea into a new application</small>
            </button>

            <button
              className={
                mode === "transform" ? "mode activeMode" : "mode"
              }
              onClick={() => {
                setMode("transform");
                setError("");
                setStatus("Ready");
              }}
              disabled={building}
            >
              <strong>Transform Existing</strong>
              <small>Import, understand and upgrade an existing project</small>
            </button>
          </div>

          {mode === "build" ? (
            <>
              <h2>What do you want to build?</h2>

              <p>
                Describe your application in plain English. The factory
                plans, generates, builds, tests, repairs and prepares it
                for live preview.
              </p>
            </>
          ) : (
            <>
              <h2>Transform an existing application.</h2>

              <p>
                Bring an existing project from another platform or
                development environment. Analyze it, plan improvements
                and transform it into a stronger production-ready
                application.
              </p>

              <div
                className="dropZone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleProjectDrop}
              >
                <div className="dropIcon">↥</div>

                <strong>Drag & drop your project here</strong>

                <span>
                  Drop project files, folders or exported project
                  archives.
                </span>

                <label className="chooseFiles">
                  Choose Files
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    hidden
                  />
                </label>

                {importedFiles.length > 0 && (
                  <div className="importedInfo">
                    ✓ {importedFiles.length} file(s) imported
                  </div>
                )}
              </div>
            </>
          )}

          <div className="promptBox">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === "build"
                  ? "Build me a professional application..."
                  : "Describe what you want changed, upgraded or rebuilt..."
              }
              disabled={building}
            />

            <div className="promptFooter">
              <div className="promptInfo">
                <span className="spark">✦</span>
                <span>
                  {mode === "build"
                    ? "New application"
                    : "Existing application transformation"}
                </span>
              </div>

              <button
                className="buildButton"
                onClick={buildApp}
                disabled={
                  building ||
                  !prompt.trim() ||
                  (mode === "transform" && importedFiles.length === 0)
                }
              >
                <span>
                  {building
                    ? "PROCESSING..."
                    : mode === "build"
                      ? "BUILD APP"
                      : "TRANSFORM APP"}
                </span>

                <span className="buttonArrow">→</span>
              </button>
            </div>
          </div>

          {mode === "build" && (
            <div className="examples">
              <span>Try an idea:</span>

              {examples.map((example) => (
                <button
                  key={example}
                  onClick={() => setPrompt(example)}
                  disabled={building}
                >
                  {example}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="workspace">
          <div className="panel activity">
            <div className="panelHeader">
              <div>
                <span className="panelEyebrow">AGENT ACTIVITY</span>
                <h3>{status}</h3>
              </div>

              <span className={`status ${building ? "working" : "ready"}`}>
                <span className="statusDot" />
                {building ? "WORKING" : "READY"}
              </span>
            </div>

            <div className="logs">
              {logs.map((log, index) => (
                <div className="log" key={`${log}-${index}`}>
                  <span className="logIcon">
                    {log.startsWith("✓")
                      ? "✓"
                      : log.startsWith("✗")
                        ? "!"
                        : "→"}
                  </span>

                  <span>{log.replace(/^[✓✗→]\s*/, "")}</span>
                </div>
              ))}
            </div>

            {error && <div className="error">{error}</div>}
          </div>

          <div className="panel files">
            <div className="panelHeader">
              <div>
                <span className="panelEyebrow">PROJECT</span>
                <h3>Files</h3>
              </div>

              <span className="fileCount">
                {mode === "build"
                  ? files.length
                  : importedFiles.length}
              </span>
            </div>

            {mode === "build" ? (
              files.length === 0 ? (
                <div className="empty">
                  <div className="emptyIcon">◇</div>
                  <strong>No application generated yet</strong>
                  <span>
                    Your generated project files will appear here.
                  </span>
                </div>
              ) : (
                <div className="fileList">
                  {files.map((file) => (
                    <div className="file" key={file}>
                      <span>{file.endsWith(".jsx") ? "⚛" : "◇"}</span>
                      <span>{file}</span>
                    </div>
                  ))}
                </div>
              )
            ) : importedFiles.length === 0 ? (
              <div className="empty">
                <div className="emptyIcon">↥</div>
                <strong>No project imported</strong>
                <span>
                  Drop an existing application above to begin.
                </span>
              </div>
            ) : (
              <div className="fileList">
                {importedFiles.slice(0, 50).map((file, index) => (
                  <div
                    className="file"
                    key={`${file.name}-${index}`}
                  >
                    <span>◇</span>
                    <span>{file.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="previewPanel">
          <div className="previewHeader">
            <div>
              <span className="panelEyebrow">LIVE PREVIEW</span>
              <h3>Your application</h3>
            </div>

            <div className="previewActions">
              <button onClick={refreshPreview}>
                ↻ <span>Refresh</span>
              </button>

              <button onClick={openPreview}>
                ↗ <span>Open</span>
              </button>

              <button onClick={fullscreenPreview}>
                ⛶ <span>Fullscreen</span>
              </button>
            </div>
          </div>

          <div className="previewBrowser">
            <div className="browserBar">
              <div className="browserDots">
                <span />
                <span />
                <span />
              </div>

              <div className="browserAddress">
                <span className="lock">⌁</span>
                127.0.0.1:8787/preview
              </div>

              <div className="browserStatus">
                <span className="dot" />
                LIVE
              </div>
            </div>

            <div className="previewFrameWrap">
              <iframe
                key={previewKey}
                id="livePreviewFrame"
                className="livePreviewFrame"
                src={`http://127.0.0.1:8787/preview?t=${previewKey}`}
                title="Live Preview"
              />
            </div>
          </div>
        </section>

        <section className="pipeline">
          <div className="pipelineTitle">
            <span className="panelEyebrow">FACTORY PIPELINE</span>
            <h3>
              {mode === "build"
                ? "Idea → Production"
                : "Existing App → Production"}
            </h3>
          </div>

          {(mode === "build"
            ? [
                ["01", "PLAN", "Requirements & architecture"],
                ["02", "BUILD", "Generate application"],
                ["03", "TEST", "Validate the project"],
                ["04", "FIX", "Repair build errors"],
                ["05", "PREVIEW", "Run the application"],
              ]
            : [
                ["01", "IMPORT", "Bring in existing project"],
                ["02", "ANALYZE", "Understand architecture"],
                ["03", "TRANSFORM", "Apply requested changes"],
                ["04", "TEST", "Validate & repair"],
                ["05", "PREVIEW", "Run upgraded application"],
              ]
          ).map(([number, title, description], index, steps) => (
            <div className="step" key={number}>
              <span className="stepNumber">{number}</span>

              <div className="stepContent">
                <strong>{title}</strong>
                <small>{description}</small>
              </div>

              {index < steps.length - 1 && (
                <span className="stepArrow">→</span>
              )}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export default App;
