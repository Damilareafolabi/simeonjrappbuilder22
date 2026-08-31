export async function factoryHealth() {
  const r = await fetch("http://127.0.0.1:8787/api/health");
  return r.json();
}

export async function aiStatus() {
  const r = await fetch("http://127.0.0.1:8787/api/ai/status");
  return r.json();
}

export async function buildApplication(prompt) {
  const r = await fetch("http://127.0.0.1:8787/api/ai/build", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({prompt})
  });

  const data = await r.json();

  if (!r.ok || !data.ok) {
    throw new Error(data.error || "Factory build failed");
  }

  return data;
}

export async function getGeneratedFiles() {
  const r = await fetch("http://127.0.0.1:8787/api/generated/files");
  return r.json();
}
