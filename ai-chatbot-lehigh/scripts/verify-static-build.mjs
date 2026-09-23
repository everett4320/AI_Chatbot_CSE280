import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const clientIndex = resolve(projectRoot, "build", "client", "index.html");
const serverEntry = resolve(projectRoot, "build", "server", "index.js");
const configuredBase = process.env.VITE_BASE_PATH?.trim() || "/";
const basePath =
  configuredBase === "/"
    ? "/"
    : `/${configuredBase.replace(/^\/+|\/+$/g, "")}/`;
const failures = [];

if (!existsSync(clientIndex)) {
  failures.push("build/client/index.html is missing.");
}

if (existsSync(serverEntry)) {
  failures.push("build/server/index.js exists; the production artifact must be static.");
}

if (existsSync(clientIndex)) {
  const html = readFileSync(clientIndex, "utf8");
  if (!html.includes('"ssr":false')) {
    failures.push("index.html does not identify a React Router SPA build.");
  }
  if (!html.includes(`"basename":"${basePath}"`)) {
    failures.push(`index.html does not use the configured base path '${basePath}'.`);
  }
  if (!html.includes(`${basePath}assets/`)) {
    failures.push(`index.html does not reference assets below '${basePath}'.`);
  }
}

if (failures.length) {
  console.error("Static build verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Static Apache artifact verified at '${basePath}'.`);
