// server/auth.ts
import { betterAuth } from "better-auth";
import { createJazzSession } from "jazz-tools/backend";
import { jazzAdapter } from "jazz-tools/better-auth-adapter";

// src/jazz/permissions.ts
import { schema as s3 } from "jazz-tools";

// src/jazz/schema-better-auth/schema.ts
import { schema as s } from "jazz-tools";
var schema = {
  better_auth_user: s.table({
    name: s.string(),
    email: s.string(),
    emailVerified: s.boolean(),
    image: s.string().optional(),
    createdAt: s.allowExternalProvenanceName(s.timestamp()),
    updatedAt: s.allowExternalProvenanceName(s.timestamp())
  }, {}),
  better_auth_session: s.table({
    expiresAt: s.timestamp(),
    token: s.string(),
    createdAt: s.allowExternalProvenanceName(s.timestamp()),
    updatedAt: s.allowExternalProvenanceName(s.timestamp()),
    ipAddress: s.string().optional(),
    userAgent: s.string().optional(),
    userId: s.uuid()
  }, {
    userIdRelation: s.rel("better_auth_user", "userId")
  }),
  better_auth_account: s.table({
    issuer: s.string(),
    accountId: s.string(),
    providerId: s.string(),
    userId: s.uuid(),
    accessToken: s.string().optional(),
    refreshToken: s.string().optional(),
    idToken: s.string().optional(),
    accessTokenExpiresAt: s.timestamp().optional(),
    refreshTokenExpiresAt: s.timestamp().optional(),
    scope: s.string().optional(),
    password: s.string().optional(),
    createdAt: s.allowExternalProvenanceName(s.timestamp()),
    updatedAt: s.allowExternalProvenanceName(s.timestamp())
  }, {
    userIdRelation: s.rel("better_auth_user", "userId")
  }),
  better_auth_verification: s.table({
    identifier: s.string(),
    value: s.string(),
    expiresAt: s.timestamp(),
    createdAt: s.allowExternalProvenanceName(s.timestamp()),
    updatedAt: s.allowExternalProvenanceName(s.timestamp())
  }, {}),
  better_auth_jwks: s.table({
    publicKey: s.string(),
    privateKey: s.string(),
    createdAt: s.allowExternalProvenanceName(s.timestamp()),
    expiresAt: s.timestamp().optional(),
    alg: s.string().optional(),
    crv: s.string().optional()
  }, {})
};
var app = s.defineApp(schema);
var wasmSchema = app.wasmSchema;
var permissions = s.definePermissions(app, ({ policy }) => {
  policy.better_auth_user.allowRead.never();
  policy.better_auth_user.allowInsert.never();
  policy.better_auth_user.allowUpdate.never();
  policy.better_auth_user.allowDelete.never();
  policy.better_auth_session.allowRead.never();
  policy.better_auth_session.allowInsert.never();
  policy.better_auth_session.allowUpdate.never();
  policy.better_auth_session.allowDelete.never();
  policy.better_auth_account.allowRead.never();
  policy.better_auth_account.allowInsert.never();
  policy.better_auth_account.allowUpdate.never();
  policy.better_auth_account.allowDelete.never();
  policy.better_auth_verification.allowRead.never();
  policy.better_auth_verification.allowInsert.never();
  policy.better_auth_verification.allowUpdate.never();
  policy.better_auth_verification.allowDelete.never();
  policy.better_auth_jwks.allowRead.never();
  policy.better_auth_jwks.allowInsert.never();
  policy.better_auth_jwks.allowUpdate.never();
  policy.better_auth_jwks.allowDelete.never();
});

// src/jazz/schema.ts
import { schema as s2 } from "jazz-tools";
var app2 = s2.defineApp({
  ...schema,
  notes_records: s2.table({
    scope: s2.string(),
    collection: s2.string(),
    record_id: s2.string(),
    value: s2.json(),
    updated_at: s2.string(),
    deleted: s2.boolean()
  }, {}),
  notes_files: s2.table({
    file_key: s2.string(),
    media_type: s2.string(),
    bytes: s2.bytes(),
    updated_at: s2.string(),
    deleted: s2.boolean()
  }, {})
});

// src/jazz/permissions.ts
var appPermissions = s3.definePermissions(app2, ({ policy, session, allOf }) => {
  const mine = { $createdBy: session.user };
  const unchanged = allOf([]);
  policy.notes_records.allowRead.where(mine);
  policy.notes_records.allowInsert.always();
  policy.notes_records.allowUpdate.whereOld(mine).whereNew(unchanged);
  policy.notes_records.allowDelete.where(mine);
  policy.notes_files.allowRead.where(mine);
  policy.notes_files.allowInsert.always();
  policy.notes_files.allowUpdate.whereOld(mine).whereNew(unchanged);
  policy.notes_files.allowDelete.where(mine);
});
var permissions_default = {
  ...permissions,
  ...appPermissions
};

// server/auth-options.ts
import { jwt } from "better-auth/plugins";
var DEV_SECRET = "notes-dev-only-secret-please-change-me-32";
function authOrigin() {
  return (process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:8870").replace(/\/$/, "");
}
function onVercel() {
  return Boolean(process.env.VERCEL);
}
var PRODUCTION_HOST = "notes.nasrul.info";
function tokenIssuer() {
  if (!onVercel()) return authOrigin();
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (host && !host.endsWith(".vercel.app")) return `https://${host}`;
  return `https://${PRODUCTION_HOST}`;
}
function authSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (onVercel()) {
    if (!secret || secret.length < 32) {
      throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
    }
    return secret;
  }
  return secret ?? DEV_SECRET;
}
function trustedOrigins(origin) {
  const origins = /* @__PURE__ */ new Set([origin]);
  try {
    const url = new URL(origin);
    const swap = url.hostname === "127.0.0.1" ? "localhost" : url.hostname === "localhost" ? "127.0.0.1" : null;
    if (swap) {
      url.hostname = swap;
      origins.add(url.origin);
    }
  } catch {
  }
  return [...origins];
}
function vercelBaseURL(issuer) {
  const allowedHosts = ["*.vercel.app", PRODUCTION_HOST];
  const host = new URL(issuer).host;
  if (!allowedHosts.includes(host)) allowedHosts.push(host);
  return { allowedHosts, protocol: "https", fallback: issuer };
}
function authOptions() {
  const issuer = tokenIssuer();
  const vercel = onVercel();
  return {
    baseURL: vercel ? vercelBaseURL(issuer) : authOrigin(),
    secret: authSecret(),
    emailAndPassword: { enabled: true, autoSignIn: true, minPasswordLength: 8 },
    ...vercel ? {} : { trustedOrigins: trustedOrigins(authOrigin()) },
    advanced: {
      database: { generateId: "uuid" },
      ...vercel ? { trustedProxyHeaders: true } : {}
    },
    plugins: [
      jwt({
        jwks: { keyPairConfig: { alg: "ES256" } },
        jwt: { issuer, audience: issuer }
      })
    ]
  };
}

// server/auth.ts
async function createAuthServer(target) {
  const appId = target?.appId ?? process.env.VITE_JAZZ_APP_ID ?? process.env.JAZZ_APP_ID;
  const serverUrl = target?.serverUrl ?? process.env.VITE_JAZZ_SERVER_URL;
  const backendSecret = target?.backendSecret ?? process.env.BACKEND_SECRET;
  if (!appId || !serverUrl || !backendSecret) {
    throw new Error("Better Auth needs a Jazz app id, server URL, and backend secret");
  }
  const options = authOptions();
  const issuer = tokenIssuer();
  const config2 = {
    app: app2,
    permissions: permissions_default,
    appId,
    serverUrl,
    env: target?.env ?? (process.env.NODE_ENV === "production" ? "prod" : "dev"),
    driver: { type: "memory" },
    jwksUrl: `${issuer}/api/auth/jwks`,
    jwtIssuer: issuer,
    jwtAudience: issuer
  };
  const session = await createJazzSession({ ...config2, initial: { backendSecret } });
  const snapshot = session.getSnapshot();
  if (snapshot.status !== "ready" || !snapshot.client) {
    throw snapshot.error ?? new Error("The Jazz backend session is not ready");
  }
  const client = snapshot.client;
  const auth = betterAuth({
    ...options,
    database: jazzAdapter({
      db: async () => client.db,
      schema: app2.wasmSchema
    })
  });
  return {
    auth,
    close: async () => {
      await session.close();
    }
  };
}

// server/vercel/auth-handler.ts
var config = { maxDuration: 30 };
var pending;
function authServer() {
  if (!pending) {
    pending = createAuthServer({ env: "prod" }).catch((error) => {
      pending = void 0;
      throw error;
    });
  }
  return pending;
}
var auth_handler_default = {
  async fetch(request) {
    try {
      const { auth } = await authServer();
      return auth.handler(request);
    } catch (error) {
      console.error(error);
      return Response.json({ error: "Auth server is unavailable" }, { status: 500 });
    }
  }
};
export {
  config,
  auth_handler_default as default
};
