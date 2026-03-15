import { defineConfig } from "vite";
import { execSync } from "child_process";

const host = process.env.TAURI_DEV_HOST;
const gitSha = execSync("git rev-parse HEAD").toString().trim();

export default defineConfig({
  clearScreen: false,
  define: {
    __GIT_SHA__: JSON.stringify(gitSha),
  },
  server: {
    port: 5199,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 5174 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
});
