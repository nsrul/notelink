import type { IncomingMessage, ServerResponse } from "node:http";

/** Better Auth and the Jazz coordinates the browser should open. Anything else
 *  falls through to Vite or the static file server. */
export function handleAuthRequest(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
  input: {
    appId: string;
    serverUrl: string;
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
  },
): void {
  const path = req.url?.split("?")[0] ?? "";
  if (path === "/api/jazz-config") {
    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.setHeader("cache-control", "no-store");
    res.end(JSON.stringify({ appId: input.appId, serverUrl: input.serverUrl, env: "dev" }));
    return;
  }
  if (path.startsWith("/api/auth")) {
    void input.handler(req, res);
    return;
  }
  next();
}
