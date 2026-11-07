import { jazzCloudConfig, type JazzSyncOptions } from "./jazz-sync";

export type JazzClientConfig = Pick<JazzSyncOptions, "appId" | "serverUrl" | "env">;

/** The Jazz server this page should open. The auth server publishes its own
 *  local server at `/api/jazz-config`. A static host has no such route, so
 *  the page keeps the address baked into the build. */
export async function loadJazzClientConfig(): Promise<JazzClientConfig | null> {
  if (typeof window !== "undefined") {
    try {
      const response = await fetch("/api/jazz-config");
      if (response.ok) {
        const body = await response.json() as { appId?: unknown; serverUrl?: unknown; env?: unknown };
        if (typeof body.appId === "string" && body.appId && typeof body.serverUrl === "string" && body.serverUrl) {
          return {
            appId: body.appId,
            serverUrl: body.serverUrl,
            env: typeof body.env === "string" && body.env ? body.env : "dev",
          };
        }
      }
    } catch {
      // Static hosting has no auth server.
    }
  }
  return jazzCloudConfig();
}
