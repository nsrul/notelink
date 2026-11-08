import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { toNodeHandler } from "better-auth/node";
import { notesBackend } from "./auth.ts";
import { handleNotesRequest } from "./routes.ts";

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

const { jazz, auth } = notesBackend();
const handler = toNodeHandler(auth);
const indexHtml = join(distDir, "index.html");

const server = createServer((req, res) => {
  handleNotesRequest(req, res, () => {
    const path = staticFile(req.url ?? "/") ?? indexHtml;
    sendFile(res, path);
  }, {
    auth: handler,
    jazz: (request, response, next) => jazz.nodeHandler(request, response, next),
  });
});

void jazz.attach(server).catch((error: unknown) => {
  console.error("[notes] Jazz sockets did not attach:", error instanceof Error ? error.message : error);
});

server.listen(port, host, () => {
  console.log(`[notes] http://${host}:${port}`);
});

async function shutdown() {
  server.close();
  await jazz.close().catch(() => undefined);
  process.exit(0);
}
process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
