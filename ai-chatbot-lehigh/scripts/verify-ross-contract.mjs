import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const activeDocs = ["AGENT.md", "CLAUDE.md"];
const forbidden = [
  "8lyrpsdez5.execute-api.us-east-1.amazonaws.com",
  '"bot_name": "le-chat"',
  '"bot_name":"le-chat"',
];
const required = [
  "VITE_CHAT_API_URL",
  "VITE_CHAT_BOT_NAME",
  "API_CONTRACT.md",
  "npm run verify",
];

const failures = [];
for (const file of activeDocs) {
  const content = readFileSync(resolve(projectRoot, file), "utf8");
  for (const value of forbidden) {
    if (content.includes(value)) failures.push(`${file} contains retired clone configuration: ${value}`);
  }
  for (const value of required) {
    if (!content.includes(value)) failures.push(`${file} is missing current Ross guidance: ${value}`);
  }
}

if (failures.length) {
  console.error("Ross contract documentation check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Ross contract documentation is current.");
