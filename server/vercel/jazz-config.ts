import { jazzClientConfig } from "../jazz-public.ts";

export const config = { maxDuration: 15 };

/** Tells the page this host can admit an account. Coordinates stay server-side. */
export default {
  async fetch(): Promise<Response> {
    return Response.json(jazzClientConfig(), { headers: { "cache-control": "no-store" } });
  },
};
