import type { Config } from "@react-router/dev/config";

function normalizeBasePath(value: string | undefined) {
  const path = value?.trim();
  if (!path || path === "/") return "/";

  return `/${path.replace(/^\/+|\/+$/g, "")}/`;
}

export default {
  basename: normalizeBasePath(process.env.VITE_BASE_PATH),
  ssr: true,
} satisfies Config;
