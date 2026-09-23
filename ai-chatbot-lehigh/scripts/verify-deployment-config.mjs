const required = ["VITE_CHAT_API_URL", "VITE_CHAT_BOT_NAME"];
const values = Object.fromEntries(
  required.map((name) => [name, process.env[name]?.trim() ?? ""]),
);
const basePath = (process.env.VITE_BASE_PATH ?? "/").trim() || "/";
const errors = [];

for (const name of required) {
  if (!values[name]) errors.push(`${name} must be a non-empty build-time value.`);
}

if (values.VITE_CHAT_API_URL) {
  try {
    const url = new URL(values.VITE_CHAT_API_URL);
    if (url.protocol !== "https:") {
      errors.push("VITE_CHAT_API_URL must use https.");
    }
  } catch {
    errors.push("VITE_CHAT_API_URL must be a valid absolute URL.");
  }
}

if (
  basePath !== "/" &&
  (!basePath.startsWith("/") || !basePath.endsWith("/") || basePath.includes("//"))
) {
  errors.push(
    "VITE_BASE_PATH must be '/' or a canonical path with one leading and one trailing '/'.",
  );
}

if (errors.length) {
  console.error("Deployment configuration is incomplete:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Deployment configuration accepted for bot '${values.VITE_CHAT_BOT_NAME}' at '${basePath}'.`,
);
