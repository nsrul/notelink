import type { Plugin, ViteDevServer } from "vite";
import { handleAuthRequest } from "./routes.ts";
import { startNotesJazzServer } from "./local-jazz.ts";

/** Serve Better Auth from the Vite dev server, backed by a local Jazz server
 *  that trusts Better Auth's JWKS. The browser learns that server's address
 *  from `/api/jazz-config`, so a Jazz Cloud URL in `.env` is left for
 *  production builds. */
export function betterAuthPlugin(): Plugin {
  let devServer: ViteDevServer | undefined;
  return {
    name: "notes-better-auth",
    async configureServer(server) {
      devServer = server;
      const jazz = await startNotesJazzServer();
      const watcher = jazz.watch(() => {
        devServer?.ws.send({ type: "full-reload" });
      });

      // Vite exposes `config.env` to `import.meta.env`. Overwrite the public
      // pair so a Cloud URL in `.env` does not send the dev app to a server
      // that cannot fetch this machine's JWKS.
      const configEnv = server.config as typeof server.config & { env?: Record<string, string> };
      configEnv.env ??= {};
      configEnv.env.VITE_JAZZ_APP_ID = jazz.appId;
      configEnv.env.VITE_JAZZ_SERVER_URL = jazz.url;

      const { createAuthServer } = await import("./auth.ts");
      const { toNodeHandler } = await import("better-auth/node");
      const { auth, close } = await createAuthServer({
        appId: jazz.appId,
        serverUrl: jazz.url,
        backendSecret: jazz.backendSecret,
        env: "dev",
      });
      const handler = toNodeHandler(auth);

      server.middlewares.use((req, res, next) => {
        handleAuthRequest(req, res, next, { appId: jazz.appId, serverUrl: jazz.url, handler });
      });

      server.httpServer?.once("close", () => {
        watcher.close();
        void close().catch(() => undefined);
      });
    },
  };
}
