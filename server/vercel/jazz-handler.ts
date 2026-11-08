import { notesBackend } from "../auth.ts";
import { jazzRequest } from "./jazz-request.ts";

export const config = { maxDuration: 30 };

/** Sync and account admission. The browser talks to this host; Jazz Cloud
 *  hears only this backend. */
export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const { jazz } = notesBackend();
      const restored = jazzRequest(request);
      const routed = jazz.next();
      if (restored.method === "POST") return await routed.POST(restored);
      if (restored.method === "DELETE") return await routed.DELETE(restored);
      return await routed.GET(restored);
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Jazz is unavailable");
      return Response.json({ error: "Jazz is unavailable" }, { status: 500 });
    }
  },
};
