import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

function normalizeBasePath(value: string | undefined) {
  const path = value?.trim();
  if (!path || path === "/") return "/";

  return `/${path.replace(/^\/+|\/+$/g, "")}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  return {
    base: normalizeBasePath(env.VITE_BASE_PATH),
    server: {
      port: 6173,
    },
    plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  };
});
