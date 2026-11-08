/** What the browser needs to decide whether this host can admit an account.
 *  The app id, the Cloud URL, and the admin secret stay on the server. */
export function jazzClientConfig(
  env: NodeJS.ProcessEnv = process.env,
): { enabled: true; env: "dev" | "prod" } {
  return { enabled: true, env: env.VERCEL ? "prod" : "dev" };
}
