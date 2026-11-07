import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { build } from "esbuild";

if (!existsSync("node_modules/esbuild/bin/esbuild")) {
  const install = spawnSync(process.execPath, ["node_modules/esbuild/install.js"], { stdio: "inherit" });
  if (install.status !== 0) process.exit(install.status ?? 1);
}

/** Vercel's function builder loads the project's TypeScript, and TypeScript 7
 *  does not expose the compiler API that builder calls. Ship plain JavaScript
 *  instead. Bundle the JavaScript dependencies and leave jazz-napi external so
 *  only the native addon is traced into the function. */
await mkdir("api/auth", { recursive: true });

const shared = {
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  external: ["jazz-napi"],
};

await build({
  ...shared,
  entryPoints: ["server/vercel/jazz-config.ts"],
  outfile: "api/jazz-config.js",
});

await build({
  ...shared,
  entryPoints: ["server/vercel/auth-handler.ts"],
  outfile: "api/auth/[...all].js",
});
