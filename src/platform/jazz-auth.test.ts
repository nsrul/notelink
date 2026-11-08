import { ReadTier, type JsonValue } from "jazz-tools";
import { memory } from "jazz-tools/backend";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../jazz/schema";
import { openNotesBackend, type NotesBackend } from "../../server/auth.ts";

const origin = "http://127.0.0.1:8870";

describe("Better Auth with Jazz", { timeout: 60_000 }, () => {
  let backend: NotesBackend;
  const previousUrl = process.env.BETTER_AUTH_URL;
  const previousSecret = process.env.BETTER_AUTH_SECRET;
  const previousVercel = process.env.VERCEL;

  beforeAll(async () => {
    process.env.BETTER_AUTH_URL = origin;
    process.env.BETTER_AUTH_SECRET = "notes-test-secret-please-change-me-32chars";
    delete process.env.VERCEL;
    backend = openNotesBackend(memory());
    await backend.jazz.ready();
  }, 120_000);

  afterAll(async () => {
    if (previousUrl === undefined) delete process.env.BETTER_AUTH_URL;
    else process.env.BETTER_AUTH_URL = previousUrl;
    if (previousSecret === undefined) delete process.env.BETTER_AUTH_SECRET;
    else process.env.BETTER_AUTH_SECRET = previousSecret;
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
    await backend?.jazz.close();
  });

  async function signUp(email: string): Promise<string> {
    const response = await backend.auth.handler(new Request(`${origin}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ email, password: "password-12", name: email.split("@")[0] }),
    }));
    const body = await response.text();
    expect(response.ok, body).toBe(true);
    const cookie = response.headers.getSetCookie().map(item => item.split(";")[0]).join("; ");
    expect(cookie).not.toBe("");
    return cookie;
  }

  async function admit(cookie: string): Promise<string> {
    const response = await backend.jazz.handle(new Request(`${origin}/jazz/apps/local/accounts/backend-sign-in`, {
      method: "POST",
      headers: { cookie, origin },
    }));
    const body = await response.text();
    expect(response.ok, body).toBe(true);
    const parsed = JSON.parse(body) as { account?: string };
    expect(parsed.account).toBeTruthy();
    return parsed.account!;
  }

  function asUser(cookie: string): Request {
    return new Request(`${origin}/api/notes`, { headers: { cookie, origin } });
  }

  it("admits a password account and keeps its rows private", async () => {
    const adaCookie = await signUp(`ada-${crypto.randomUUID()}@example.com`);
    const adaAccount = await admit(adaCookie);
    const ada = await backend.jazz.forReqUser(asUser(adaCookie));
    const rowId = crypto.randomUUID();
    await ada.upsert(app.notes_records, rowId, {
      scope: "personal",
      collection: "workspace_settings",
      record_id: "preferences",
      value: { theme: "dark" } as JsonValue,
      updated_at: String(Date.now()),
      deleted: false,
    }).wait({ tier: "global" });

    expect(await ada.all(app.notes_records, { tier: ReadTier.Remote })).toEqual([
      expect.objectContaining({ record_id: "preferences", value: { theme: "dark" } }),
    ]);

    const graceCookie = await signUp(`grace-${crypto.randomUUID()}@example.com`);
    const graceAccount = await admit(graceCookie);
    expect(graceAccount).not.toBe(adaAccount);
    const grace = await backend.jazz.forReqUser(asUser(graceCookie));
    expect(await grace.all(app.notes_records, { tier: ReadTier.Remote })).toEqual([]);

    const again = await admit(adaCookie);
    expect(again).toBe(adaAccount);
    const returned = await backend.jazz.forReqUser(asUser(adaCookie));
    expect(await returned.all(app.notes_records, { tier: ReadTier.Remote })).toEqual([
      expect.objectContaining({ record_id: "preferences", value: { theme: "dark" } }),
    ]);
  });
});
