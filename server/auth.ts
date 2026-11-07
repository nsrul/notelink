import { betterAuth } from "better-auth";
import { createJazzSession, type JazzSessionConfig } from "jazz-tools/backend";
import { jazzAdapter } from "jazz-tools/better-auth-adapter";
import permissions from "../src/jazz/permissions.ts";
import { app } from "../src/jazz/schema.ts";
import { authOptions } from "./auth-options.ts";

export interface AuthServerTarget {
  appId: string;
  serverUrl: string;
  backendSecret: string;
  env?: "dev" | "prod";
}

/** Open the admitted backend session that owns Better Auth's rows, then build
 *  Better Auth on top of it. Pass the Jazz server this process just started,
 *  or the one named by the environment for a deployed auth server. */
export async function createAuthServer(target?: AuthServerTarget) {
  const appId = target?.appId ?? process.env.VITE_JAZZ_APP_ID ?? process.env.JAZZ_APP_ID;
  const serverUrl = target?.serverUrl ?? process.env.VITE_JAZZ_SERVER_URL;
  const backendSecret = target?.backendSecret ?? process.env.BACKEND_SECRET;
  if (!appId || !serverUrl || !backendSecret) {
    throw new Error("Better Auth needs a Jazz app id, server URL, and backend secret");
  }

  const options = authOptions();
  const config: JazzSessionConfig = {
    app,
    permissions,
    appId,
    serverUrl,
    env: target?.env ?? (process.env.NODE_ENV === "production" ? "prod" : "dev"),
    driver: { type: "memory" },
    jwksUrl: `${options.baseURL}/api/auth/jwks`,
    jwtIssuer: options.baseURL,
    jwtAudience: options.baseURL,
  };

  const session = await createJazzSession({ ...config, initial: { backendSecret } });
  const snapshot = session.getSnapshot();
  if (snapshot.status !== "ready" || !snapshot.client) {
    throw snapshot.error ?? new Error("The Jazz backend session is not ready");
  }
  const client = snapshot.client;

  const auth = betterAuth({
    ...options,
    database: jazzAdapter({
      db: async () => client.db,
      schema: app.wasmSchema,
    }),
  });

  return {
    auth,
    close: async () => {
      await session.close();
    },
  };
}
