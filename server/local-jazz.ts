import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { startLocalJazzServer, watchSchema, type LocalJazzServerHandle } from "jazz-tools/dev";
import permissions from "../src/jazz/permissions.ts";
import { app } from "../src/jazz/schema.ts";
import { authOrigin } from "./auth-options.ts";

const dataDir = join(process.cwd(), ".jazz-data");
const schemaDir = join(process.cwd(), "src", "jazz");

export interface NotesJazzServer {
  appId: string;
  url: string;
  adminSecret: string;
  backendSecret: string;
  /** Published schema changes. Dev uses this to reload the browser. */
  watch(onPush: () => void): { close(): void };
  stop(): Promise<void>;
}

let starting: Promise<NotesJazzServer> | undefined;

async function readOrCreate(name: string, create: () => string): Promise<string> {
  const path = join(dataDir, name);
  try {
    const value = (await readFile(path, "utf8")).trim();
    if (value) return value;
  } catch {
    // First run on this machine.
  }
  const value = create();
  await writeFile(path, `${value}\n`);
  return value;
}

/** One local Jazz server for this process, trusting Better Auth's JWKS on the
 *  auth origin. Accounts and notebook rows persist in `.jazz-data`. */
export function startNotesJazzServer(): Promise<NotesJazzServer> {
  if (!starting) {
    starting = open().catch(error => {
      starting = undefined;
      throw error;
    });
  }
  return starting;
}

async function open(): Promise<NotesJazzServer> {
  await mkdir(dataDir, { recursive: true });
  const origin = authOrigin();
  const appId = await readOrCreate("app-id", () => randomUUID());
  const adminSecret = await readOrCreate("admin-secret", () => `notes-admin-${randomUUID()}`);
  const backendSecret = await readOrCreate("backend-secret", () => `notes-backend-${randomUUID()}`);
  const server: LocalJazzServerHandle = await startLocalJazzServer({
    appId,
    dataDir,
    adminSecret,
    backendSecret,
    allowLocalFirstAuth: false,
    jwksUrl: `${origin}/api/auth/jwks`,
    jwtIssuer: origin,
    jwtAudience: origin,
    schema: app,
    permissions,
  });
  console.log(`[notes] Jazz server ${server.url} (app ${server.appId})`);
  console.log(`[notes] Better Auth ${origin}/api/auth`);
  return {
    appId: server.appId,
    url: server.url,
    adminSecret: server.adminSecret,
    backendSecret: server.backendSecret,
    watch(onPush) {
      return watchSchema({
        schemaDir,
        serverUrl: server.url,
        appId: server.appId,
        adminSecret: server.adminSecret,
        onPush() {
          console.log("[notes] Jazz schema updated");
          onPush();
        },
        onError(error) {
          console.error("[notes] Jazz schema push failed:", error.message);
        },
      });
    },
    stop: () => server.stop(),
  };
}
