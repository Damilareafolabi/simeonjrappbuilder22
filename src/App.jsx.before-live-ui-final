import { useState } from "react";
import "./App.css";

const examples = [
  "Create a professional inventory management system",
  "Create a CRM with customers, contacts and sales",
  "Create an employee task management dashboard",
  "Create an invoice generator",
];

function App() {
  const [prompt, setPrompt] = useState("");
  const [building, setBuilding] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [files, setFiles] = useState([]);
  const [logs, setLogs] = useState([
    "Workspace initialized",
    "Backend connected",
    "Local Qwen connected",
  ]);
  const [error, setError] = useState("");

  async function buildApp() {
    if (!prompt.trim()) return;

    setBuilding(true);
    setError("");
    setFiles([]);
    setStatus("Planning...");
    setLogs([
      "Workspace initialized",
      "Backend connected",
      "Local Qwen connected",
      "→ Planning application",
    ]);

    try {
      setStatus("Building...");
      setLogs((x) => [...x, "→ Sending requirements to Qwen"]);

      const response = await fetch("http://127.0.0.1:8787/api/ai/build", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Build failed");
      }

      setFiles(data.files || []);
      setLogs((x) => [
        ...x,
        "✓ Application files generated",
        ...(data.files || []).map((file) => `✓ ${file}`),
        "✓ Build generation complete",
      ]);

      setStatus("Build Complete");
    } catch (err) {
      setError(err.message);
      setStatus("Build Failed");
      setLogs((x) => [...x, `✗ ${err.message}`]);
    } finally {
      setBuilding(false);
    }
  }

  return (
    <div className="factory">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">SJ</div>
          <div>
            <strong>SimeonJr</strong>
            <span>App Builder</span>
          </div>
        </div>

        <button className="newApp">＋ New App</button>

        <nav>
          <div className="navSection">FACTORY</div>
          <a className="active">⌘ Build</a>
          <a>◈ Projects</a>
          <a>▣ Templates</a>
          <a>◫ Files</a>
        </nav>

        <div className="sidebarBottom">
          <div className="localAI">
            <span className="dot" />
            <div>
              <strong>Local AI</strong>
              <small>Qwen 1.5B · LM Studio</small>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">APP FACTORY</span>
            <h1>Build something.</h1>
          </div>

          <div className="connection">
            <span className="dot" />
            LOCAL AI CONNECTED
          </div>
        </header>

        <section className="hero">
          <h2>What do you want to build?</h2>
          <p>
            Describe your application. SimeonJr Agent will plan, generate and
            prepare the project for preview.
          </p>

          <div className="promptBox">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Build me a professional application..."
              disabled={building}
            />

            <div className="promptFooter">
              <span>Local Qwen · No external API required</span>

              <button
                className="buildButton"
                onClick={buildApp}
                disabled={building || !prompt.trim()}
              >
                {building ? "BUILDING..." : "BUILD APP →"}
              </button>
            </div>
          </div>

          <div className="examples">
            <span>Try:</span>
            {examples.map((example) => (
              <button key={example} onClick={() => setPrompt(example)}>
                {example}
              </button>
            ))}
          </div>
        </section>

        <section className="workspace">
          <div className="panel activity">
            <div className="panelHeader">
              <div>
                <span className="panelEyebrow">AGENT ACTIVITY</span>
                <h3>{status}</h3>
              </div>
              <span className={`status ${building ? "working" : ""}`}>
                {building ? "WORKING" : "READY"}
              </span>
            </div>

            <div className="logs">
              {logs.map((log, index) => (
                <div className="log" key={index}>
                  <span>{log.startsWith("✓") ? "✓" : log.startsWith("✗") ? "!" : "→"}</span>
                  {log.replace(/^[✓✗→]\s*/, "")}
                </div>
              ))}
            </div>

            {error && <div className="error">{error}</div>}
          </div>

          <div className="panel files">
            <div className="panelHeader">
              <div>
                <span className="panelEyebrow">GENERATED PROJECT</span>
                <h3>Files</h3>
              </div>
              <span className="fileCount">{files.length}</span>
            </div>

            {files.length === 0 ? (
              <div className="empty">
                <div className="emptyIcon">⌁</div>
                <strong>No application generated yet</strong>
                <span>Your generated project files will appear here.</span>
              </div>
            ) : (
              <div className="fileList">
                {files.map((file) => (
                  <div className="file" key={file}>
                    <span>{file.endsWith(".jsx") ? "⚛" : "◇"}</span>
                    {file}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="pipeline">
          <div className="pipelineTitle">
            <span className="panelEyebrow">FACTORY PIPELINE</span>
            <h3>Prompt → Production</h3>
          </div>

          {[
            ["01", "PLAN", "Requirements & architecture"],
            ["02", "BUILD", "Generate application"],
            ["03", "TEST", "Validate the project"],
            ["04", "FIX", "Repair build errors"],
            ["05", "PREVIEW", "Run the application"],
          ].map(([number, title, description]) => (
            <div className="step" key={number}>
              <span>{number}</span>
              <strong>{title}</strong>
              <small>{description}</small>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export default App;
