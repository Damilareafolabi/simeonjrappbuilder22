const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const APPS = path.join(ROOT, "apps");

fs.mkdirSync(APPS, { recursive: true });

const registryPath = path.join(APPS, "registry.json");

let registry = {
  version: 1,
  factory: "SimeonJr",
  applications: []
};

if (fs.existsSync(registryPath)) {
  try {
    registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  } catch {
    console.log("Existing registry invalid. Creating a clean registry.");
  }
}

const required = [
  "id",
  "name",
  "slug",
  "status",
  "createdAt",
  "workspace"
];

registry.applications = registry.applications.filter(app =>
  app && app.id && app.slug && app.workspace
);

for (const app of registry.applications) {
  for (const key of required) {
    if (!(key in app)) {
      console.warn(`Registry entry ${app.id} missing ${key}`);
    }
  }
}

fs.writeFileSync(
  registryPath,
  JSON.stringify(registry, null, 2),
  "utf8"
);

console.log("==================================================");
console.log(" SIMEONJR MULTI-APP REGISTRY");
console.log("==================================================");
console.log("");
console.log("Applications directory:");
console.log(APPS);
console.log("");
console.log("Registry:");
console.log(registryPath);
console.log("");
console.log("Applications registered:", registry.applications.length);
console.log("");
console.log("==================================================");
console.log(" MULTI-APP FOUNDATION READY");
console.log("==================================================");
