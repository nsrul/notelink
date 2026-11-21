import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { betterAuthPlugin } from "./server/vite-plugin.ts";

export default defineConfig(({ command, mode }) => {
  const testing = mode === "test" || Boolean(process.env.VITEST);
  const dev = command === "serve" && !testing;
  return {
    base: "./",
    plugins: [
      react(),
      ...(dev ? [betterAuthPlugin()] : []),
    ],
    build: {
      rollupOptions: {
        // Two static entries: the marketing page is what `/` serves, and the
        // notebook itself lives under `/app/`. They share the app's React,
        // Vite and stylesheet; the landing page carries none of its state.
        input: {
          landing: fileURLToPath(new URL("./index.html", import.meta.url)),
          app: fileURLToPath(new URL("./app/index.html", import.meta.url)),
        },
      },
    },
  };
});
