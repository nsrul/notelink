// server/jazz-public.ts
function publishedJazzConfig(env = process.env) {
  const appId = (env.VITE_JAZZ_APP_ID ?? env.JAZZ_APP_ID)?.trim();
  const serverUrl = env.VITE_JAZZ_SERVER_URL?.trim();
  if (!appId || !serverUrl) return null;
  return { appId, serverUrl, env: "prod" };
}

// server/vercel/jazz-config.ts
var config = { maxDuration: 15 };
var jazz_config_default = {
  async fetch() {
    const body = publishedJazzConfig();
    if (!body) {
      return Response.json({ error: "Jazz settings are missing" }, { status: 500 });
    }
    return Response.json(body, { headers: { "cache-control": "no-store" } });
  }
};
export {
  config,
  jazz_config_default as default
};
