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
  };
});
