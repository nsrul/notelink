import "fake-indexeddb/auto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createJazzSession, ReadTier, type AccountStore, type JsonValue } from "jazz-tools";
import { startLocalJazzServer } from "jazz-tools/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../jazz/schema";
import permissions from "../jazz/permissions";
import { handleAuthRequest } from "../../server/routes.ts";

function memoryAccountStore(): AccountStore {
  let value: string | null = null;
  return {
    async read() { return value; },
    async update(transform) { value = transform(value); },
  };
}

function listen(server: ReturnType<typeof createServer>): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") reject(new Error("The auth test server has no port"));
      else resolve(address.port);
    });
  });
}

describe("Better Auth with Jazz", { timeout: 60_000 }, () => {
  let server: Awaited<ReturnType<typeof startLocalJazzServer>>;
  let http: ReturnType<typeof createServer>;
  let closeAuth: (() => Promise<void>) | undefined;
  let origin = "";
  const previousUrl = process.env.BETTER_AUTH_URL;
  const previousSecret = process.env.BETTER_AUTH_SECRET;

  beforeAll(async () => {
    let handle: ((req: IncomingMessage, res: ServerResponse) => void) | undefined;
    http = createServer((req, res) => {
      if (!handle) {
        res.statusCode = 503;
        res.end("starting");
        return;
      }
      handle(req, res);
    });
    const port = await listen(http);
    origin = `http://127.0.0.1:${port}`;
    process.env.BETTER_AUTH_URL = origin;
    process.env.BETTER_AUTH_SECRET = "notes-test-secret-please-change-me-32chars";

    server = await startLocalJazzServer({
      inMemory: true,
      allowLocalFirstAuth: false,
      jwksUrl: `${origin}/api/auth/jwks`,
      jwtIssuer: origin,
      jwtAudience: origin,
      schema: app,
      permissions,
    });

    const { createAuthServer } = await import("../../server/auth.ts");
    const { toNodeHandler } = await import("better-auth/node");
    const started = await createAuthServer({
      appId: server.appId,
      serverUrl: server.url,
      backendSecret: server.backendSecret,
      env: "dev",
    });
    closeAuth = started.close;
    const handler = toNodeHandler(started.auth);
    handle = (req, res) => {
      handleAuthRequest(req, res, () => {
        res.statusCode = 404;
        res.end();
      }, { appId: server.appId, serverUrl: server.url, handler });
    };
  }, 120_000);

  afterAll(async () => {
    if (previousUrl === undefined) delete process.env.BETTER_AUTH_URL;
    else process.env.BETTER_AUTH_URL = previousUrl;
    if (previousSecret === undefined) delete process.env.BETTER_AUTH_SECRET;
    else process.env.BETTER_AUTH_SECRET = previousSecret;
    await closeAuth?.().catch(() => undefined);
    await new Promise<void>(resolve => http?.close(() => resolve()));
    await server?.stop();
  });

  async function signUp(email: string): Promise<string> {
    const response = await fetch(`${origin}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ email, password: "password-12", name: email.split("@")[0] }),
    });
    const body = await response.text();
    expect(response.ok, body).toBe(true);
    const cookie = response.headers.getSetCookie().map(item => item.split(";")[0]).join("; ");
    expect(cookie).not.toBe("");
    const tokenResponse = await fetch(`${origin}/api/auth/token`, { headers: { cookie, origin } });
    const tokenBody = await tokenResponse.text();
    expect(tokenResponse.ok, tokenBody).toBe(true);
    const parsed = JSON.parse(tokenBody) as { token?: string };
    expect(parsed.token).toBeTruthy();
    return parsed.token!;
  }

  async function openAccount(token: string) {
    const session = await createJazzSession({
      appId: server.appId,
      serverUrl: server.url,
      env: "dev",
      store: memoryAccountStore(),
      driver: { type: "memory" },
    });
    await session.loginOrRegisterJWT(token);
    const snapshot = session.getSnapshot();
    expect(snapshot.status).toBe("ready");
    expect(snapshot.client).toBeDefined();
    return { session, db: snapshot.client!.db, accountId: snapshot.account!.id };
  }

  it("admits a password account into Jazz and keeps its rows private", async () => {
    const adaToken = await signUp(`ada-${crypto.randomUUID()}@example.com`);
    const ada = await openAccount(adaToken);
    const rowId = crypto.randomUUID();
    await ada.db.upsert(app.notes_records, rowId, {
      scope: "personal",
      collection: "workspace_settings",
      record_id: "preferences",
      value: { theme: "dark" } as JsonValue,
      updated_at: String(Date.now()),
      deleted: false,
    }).wait({ tier: "global" });

    const ownRows = await ada.db.all(app.notes_records, { tier: ReadTier.Remote });
    expect(ownRows).toEqual([
      expect.objectContaining({ record_id: "preferences", value: { theme: "dark" } }),
    ]);

    const grace = await openAccount(await signUp(`grace-${crypto.randomUUID()}@example.com`));
    expect(grace.accountId).not.toBe(ada.accountId);
    expect(await grace.db.all(app.notes_records, { tier: ReadTier.Remote })).toEqual([]);

    const again = await openAccount(adaToken);
    expect(again.accountId).toBe(ada.accountId);
    expect(await again.db.all(app.notes_records, { tier: ReadTier.Remote })).toEqual([
      expect.objectContaining({ record_id: "preferences", value: { theme: "dark" } }),
    ]);

    await again.session.close();
    await grace.session.close();
    await ada.session.close();
  });
});
