import { publishedJazzConfig } from "../jazz-public.ts";

export const config = { maxDuration: 15 };

/** Cloud coordinates for the browser. The page prefers this response over the
 *  values baked into the build. */
export default {
  async fetch(): Promise<Response> {
    const body = publishedJazzConfig();
    if (!body) {
      return Response.json({ error: "Jazz settings are missing" }, { status: 500 });
    }
    return Response.json(body, { headers: { "cache-control": "no-store" } });
  },
};
