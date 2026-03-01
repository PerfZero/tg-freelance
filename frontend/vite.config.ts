import path from "node:path";

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const frontendEnv = loadEnv(mode, process.cwd(), "");
  const backendEnv = loadEnv(mode, path.resolve(process.cwd(), "../backend"), "");
  const botUsername =
    frontendEnv.VITE_TELEGRAM_BOT_USERNAME ??
    backendEnv.TELEGRAM_BOT_USERNAME ??
    "";

  return {
    plugins: [react()],
    define: {
      __TG_BOT_USERNAME__: JSON.stringify(botUsername),
    },
  };
});
