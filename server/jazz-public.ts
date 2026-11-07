/** Jazz Cloud coordinates the browser may see. Admin and backend secrets are
 *  never included. */
export function publishedJazzConfig(
  env: NodeJS.ProcessEnv = process.env,
): { appId: string; serverUrl: string; env: "prod" } | null {
  const appId = (env.VITE_JAZZ_APP_ID ?? env.JAZZ_APP_ID)?.trim();
  const serverUrl = env.VITE_JAZZ_SERVER_URL?.trim();
  if (!appId || !serverUrl) return null;
  return { appId, serverUrl, env: "prod" };
}
