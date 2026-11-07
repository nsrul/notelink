import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { handleAuthRequest } from "./routes.ts";
import { startNotesJazzServer } from "./local-jazz.ts";

const port = 8870;
const host = "127.0.0.1";
const distDir = resolve(process.cwd(), "dist");

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".map": "application/json",
  ".woff2": "font/woff2",
};

/** A file inside `dist`, or null when the URL escapes it. */
function staticFile(urlPath: string): string | null {
  let decoded = "/";
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  } catch {
    return null;
  }
  const relative = normalize(decoded).replace(/^([/\\])+/, "");
  const path = resolve(distDir, relative);
  if (path !== distDir && !path.startsWith(`${distDir}${sep}`)) return null;
  if (!existsSync(path) || !statSync(path).isFile()) return null;
  return path;
}

function sendFile(res: ServerResponse, path: string): void {
  res.statusCode = 200;
  res.setHeader("content-type", types[extname(path)] ?? "application/octet-stream");
  createReadStream(path).pipe(res);
}

if (!existsSync(join(distDir, "index.html"))) {
  console.error("Build the app first: npm run build");
  process.exit(1);
}

const jazz = await startNotesJazzServer();
const { createAuthServer } = await import("./auth.ts");
const { toNodeHandler } = await import("better-auth/node");
const { auth, close } = await createAuthServer({
  appId: jazz.appId,
  serverUrl: jazz.url,
  backendSecret: jazz.backendSecret,
  env: "dev",
});
const handler = toNodeHandler(auth);
const indexHtml = join(distDir, "index.html");

const server = createServer((req, res) => {
  handleAuthRequest(req, res, () => {
    const path = staticFile(req.url ?? "/") ?? indexHtml;
    sendFile(res, path);
  }, { appId: jazz.appId, serverUrl: jazz.url, handler });
});

server.listen(port, host, () => {
  console.log(`[notes] http://${host}:${port}`);
});

async function shutdown() {
  server.close();
  await close().catch(() => undefined);
  await jazz.stop().catch(() => undefined);
  process.exit(0);
}
process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
