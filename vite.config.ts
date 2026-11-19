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
        // The marketing page is a second, static entry: it shares the app's
        // React, Vite and stylesheet, but carries none of its own state.
        input: {
          app: fileURLToPath(new URL("./index.html", import.meta.url)),
          landing: fileURLToPath(new URL("./landing/index.html", import.meta.url)),
        },
      },
    },
  };
});
