import type { IncomingMessage, ServerResponse } from "node:http";
import { jazzClientConfig } from "./jazz-public.ts";

/** Better Auth, the sign-in flag, and Jazz under `/jazz`. Anything else falls
 *  through to Vite or the static file server. */
export function handleNotesRequest(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
  input: {
    auth: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    jazz: (req: IncomingMessage, res: ServerResponse, next: () => void) => void;
  },
): void {
  const path = req.url?.split("?")[0] ?? "";
  if (path === "/api/jazz-config") {
    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.setHeader("cache-control", "no-store");
    res.end(JSON.stringify(jazzClientConfig()));
    return;
  }
  if (path.startsWith("/api/auth")) {
    void input.auth(req, res);
    return;
  }
  input.jazz(req, res, next);
}
