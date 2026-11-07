import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { jazzPlugin } from "jazz-tools/dev/vite";
import { defineConfig } from "vite";
import { betterAuthPlugin } from "./server/vite-plugin.ts";

const jazzDir = fileURLToPath(new URL("./src/jazz", import.meta.url));

export default defineConfig(({ command, mode }) => {
  const testing = mode === "test" || Boolean(process.env.VITEST);
  const dev = command === "serve" && !testing;
  return {
    base: "./",
    plugins: [
      react(),
      // Dev owns its Jazz server in the auth plugin below; builds publish the
      // schema through the normal deployment flow.
      jazzPlugin({ schemaDir: jazzDir, server: false }),
      ...(dev ? [betterAuthPlugin()] : []),
    ],
  };
});
