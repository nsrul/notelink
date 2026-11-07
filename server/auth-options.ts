import { jwt } from "better-auth/plugins";

/** Origin Better Auth, its JWT issuer, and the Jazz server's JWKS check share.
 *  No trailing slash: issuer and audience are compared as exact strings. */
export function authOrigin(): string {
  return (process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:8870").replace(/\/$/, "");
}

function trustedOrigins(origin: string): string[] {
  const origins = new Set([origin]);
  try {
    const url = new URL(origin);
    const swap = url.hostname === "127.0.0.1" ? "localhost" : url.hostname === "localhost" ? "127.0.0.1" : null;
    if (swap) {
      url.hostname = swap;
      origins.add(url.origin);
    }
  } catch {
    // Better Auth reports a bad base URL itself.
  }
  return [...origins];
}

/** Better Auth settings shared by the runtime server and schema generation.
 *  The JWT plugin issues the ES256 bearer tokens the Jazz server verifies
 *  through this origin's JWKS. Jazz relations are UUID columns, so every
 *  Better Auth row id is a UUID too. */
export function authOptions() {
  const baseURL = authOrigin();
  return {
    baseURL,
    secret: process.env.BETTER_AUTH_SECRET ?? "notes-dev-only-secret-please-change-me-32",
    emailAndPassword: { enabled: true, autoSignIn: true, minPasswordLength: 8 },
    trustedOrigins: trustedOrigins(baseURL),
    advanced: {
      database: { generateId: "uuid" as const },
    },
    plugins: [
      jwt({
        jwks: { keyPairConfig: { alg: "ES256" } },
        jwt: { issuer: baseURL, audience: baseURL },
      }),
    ],
  };
}
