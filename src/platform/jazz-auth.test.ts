import "fake-indexeddb/auto";
import { createJazzSession, exportLocalFirstSecret, type AccountStore } from "jazz-tools";
import { RecoveryPhrase } from "jazz-tools/passphrase";
import { startLocalJazzServer } from "jazz-tools/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../jazz/schema";
import permissions from "../jazz/permissions";

function memoryAccountStore(): AccountStore {
  let value: string | null = null;
  return {
    async read() { return value; },
    async update(transform) { value = transform(value); },
  };
}

describe("Jazz session authentication", { timeout: 60_000 }, () => {
  let server: Awaited<ReturnType<typeof startLocalJazzServer>>;

  beforeAll(async () => {
    server = await startLocalJazzServer({
      inMemory: true,
      allowLocalFirstAuth: true,
      schema: app,
      permissions,
    });
  }, 120_000);

  afterAll(async () => {
    await server?.stop();
  });

  it("starts signed out, creates a local-first account, and restores it from its phrase", async () => {
    const session = await createJazzSession({
      appId: server.appId,
      serverUrl: server.url,
      env: "dev",
      store: memoryAccountStore(),
      driver: { type: "memory" },
    });

    expect(session.getSnapshot().status).toBe("signed-out");

    await session.createLocalFirst();
    const created = session.getSnapshot();
    expect(created.status).toBe("ready");
    expect(created.account).toBeDefined();
    const accountId = created.account!.id;
    const phrase = RecoveryPhrase.fromSecret(exportLocalFirstSecret(created.account!));
    expect(phrase.split(" ").length).toBeGreaterThan(1);

    await session.logout();
    expect(session.getSnapshot().status).toBe("signed-out");

    await session.restoreLocalFirst(RecoveryPhrase.toSecret(phrase));
    expect(session.getSnapshot().status).toBe("ready");
    expect(session.getSnapshot().account?.id).toBe(accountId);

    await session.close();
  });
});
