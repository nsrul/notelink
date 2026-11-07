import { createAuthServer } from "../auth.ts";

export const config = { maxDuration: 30 };

type AuthServer = Awaited<ReturnType<typeof createAuthServer>>;

let pending: Promise<AuthServer> | undefined;

/** One backend session per instance. Vercel has no durable disk, so this
 *  session uses Jazz Cloud and the in-memory driver. */
function authServer(): Promise<AuthServer> {
  if (!pending) {
    pending = createAuthServer({ env: "prod" }).catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
  }
  return pending;
}

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const { auth } = await authServer();
      return auth.handler(request);
    } catch (error) {
      console.error(error);
      return Response.json({ error: "Auth server is unavailable" }, { status: 500 });
    }
  },
};
