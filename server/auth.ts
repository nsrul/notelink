import { betterAuth } from "better-auth";
import { createJazz, vercel, type JazzStore } from "jazz-tools/backend";
import { jazzAdapter } from "jazz-tools/better-auth-adapter";
import permissions from "../src/jazz/permissions.ts";
import { app } from "../src/jazz/schema.ts";
import { authOptions } from "./auth-options.ts";

type SessionReader = {
  api: {
    getSession: (input: { headers: Headers }) => Promise<{ user: { id: string } } | null>;
  };
};

/** Better Auth's session cookie names the user. The Jazz core trusts this
 *  backend's credential and does not check the user's token itself. */
export function openNotesBackend(store: JazzStore) {
  const holder: { current?: SessionReader } = {};
  const jazz = createJazz({
    app,
    permissions,
    store,
    authenticate: async (request) => {
      const auth = holder.current;
      if (!auth) throw new Error("Better Auth is not ready");
      const session = await auth.api.getSession({ headers: request.headers });
      return session ? { userId: session.user.id } : null;
    },
  });
  const auth = betterAuth({
    ...authOptions(),
    database: jazzAdapter({
      db: async () => jazz.db,
      schema: app.wasmSchema,
    }),
  });
  holder.current = auth;
  return { jazz, auth };
}

export type NotesBackend = ReturnType<typeof openNotesBackend>;

let opened: ReturnType<typeof openNotesBackend> | undefined;

/** One backend for this process. `vercel()` keeps the data in `.jazz/local`
 *  on a dev machine and in this Vercel project's Sandbox core when deployed,
 *  so no Jazz Cloud app or shared secret is involved. */
export function notesBackend(): NotesBackend {
  if (!opened) {
    const maxDriveBytes = process.env.VERCEL_ENV === "preview"
      ? 1024 ** 3
      : 10 * 1024 ** 3;
    opened = openNotesBackend(vercel({ maxDriveBytes }));
  }
  return opened;
}
