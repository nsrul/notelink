import type { Server } from "node:http";
import type { Plugin, ViteDevServer } from "vite";
import { notesBackend } from "./auth.ts";
import { handleNotesRequest } from "./routes.ts";

/** Serve Better Auth and Jazz from the Vite dev server. Jazz data stays in
 *  `.jazz/local`. A Cloud URL in `.env` is for the deployed backend only. */
export function betterAuthPlugin(): Plugin {
  return {
    name: "notes-better-auth",
    configureServer(server: ViteDevServer) {
      const { jazz, auth } = notesBackend();
      const handler = toNodeHandlerLater(auth);
      server.middlewares.use((req, res, next) => {
        handleNotesRequest(req, res, next, {
          auth: handler,
          jazz: (request, response, done) => jazz.nodeHandler(request, response, done),
        });
      });
      const httpServer = server.httpServer;
      if (httpServer) void jazz.attach(httpServer as Server).catch((error: unknown) => {
        console.error("[notes] Jazz sockets did not attach:", error instanceof Error ? error.message : error);
      });
      httpServer?.once("close", () => {
        void jazz.close().catch(() => undefined);
      });
    },
  };
}

function toNodeHandlerLater(auth: ReturnType<typeof notesBackend>["auth"]) {
  let handler: ((req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => Promise<void>) | undefined;
  return async (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => {
    if (!handler) {
      const { toNodeHandler } = await import("better-auth/node");
      handler = toNodeHandler(auth);
    }
    await handler(req, res);
  };
}
