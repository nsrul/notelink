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
 *  only the native addon is traced into the function. `@vercel/sandbox` and
 *  `@vercel/functions` are CommonJS with dynamic requires, which an ESM bundle
 *  cannot run, so Vercel's tracer includes them from `node_modules`. */
await mkdir("api/auth", { recursive: true });
await mkdir("api/jazz", { recursive: true });

const shared = {
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  external: ["jazz-napi", "@vercel/sandbox", "@vercel/functions"],
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

await build({
  ...shared,
  entryPoints: ["server/vercel/jazz-handler.ts"],
  outfile: "api/jazz/[...all].js",
});
