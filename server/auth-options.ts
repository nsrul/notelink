import { jwt } from "better-auth/plugins";

const DEV_SECRET = "notes-dev-only-secret-please-change-me-32";

/** Origin the local Jazz server and a single-host auth server share.
 *  No trailing slash: issuer and audience are compared as exact strings. */
export function authOrigin(): string {
  return (process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:8870").replace(/\/$/, "");
}

function onVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

/** The custom domain of the existing Vercel project. Preview hosts are
 *  `*.vercel.app`; Jazz tokens stay on this origin so the public JWKS does not
 *  move with each deployment. */
const PRODUCTION_HOST = "notes.nasrul.info";

/** Issuer and audience stamped on Jazz JWTs.
 *  On Vercel every deployment signs with the stable production host, so Jazz
 *  Cloud has one trust anchor. Locally it is the dev server's origin. */
export function tokenIssuer(): string {
  if (!onVercel()) return authOrigin();
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (host && !host.endsWith(".vercel.app")) return `https://${host}`;
  return `https://${PRODUCTION_HOST}`;
}

function authSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (onVercel()) {
    if (!secret || secret.length < 32) {
      throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
    }
    return secret;
  }
  return secret ?? DEV_SECRET;
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

/** Hosts a Vercel deployment may serve. `*.vercel.app` covers previews and the
 *  generated alias. The custom domain is always accepted. */
function vercelBaseURL(issuer: string): { allowedHosts: string[]; protocol: "https"; fallback: string } {
  const allowedHosts = ["*.vercel.app", PRODUCTION_HOST];
  const host = new URL(issuer).host;
  if (!allowedHosts.includes(host)) allowedHosts.push(host);
  return { allowedHosts, protocol: "https", fallback: issuer };
}

/** Better Auth settings shared by the runtime server and schema generation.
 *  The JWT plugin stays so the published schema keeps its key table. Jazz
 *  admission uses the session cookie. Jazz relations are UUID columns, so
 *  every Better Auth row id is a UUID too. */
export function authOptions() {
  const issuer = tokenIssuer();
  const vercel = onVercel();
  return {
    baseURL: vercel ? vercelBaseURL(issuer) : authOrigin(),
    secret: authSecret(),
    emailAndPassword: { enabled: true, autoSignIn: true, minPasswordLength: 8 },
    ...(vercel ? {} : { trustedOrigins: trustedOrigins(authOrigin()) }),
    advanced: {
      database: { generateId: "uuid" as const },
      ...(vercel ? { trustedProxyHeaders: true as const } : {}),
    },
    plugins: [
      jwt({
        jwks: { keyPairConfig: { alg: "ES256" } },
        jwt: { issuer, audience: issuer },
      }),
    ],
  };
}
