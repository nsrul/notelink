// server/jazz-public.ts
function jazzClientConfig(env = process.env) {
  return { enabled: true, env: env.VERCEL ? "prod" : "dev" };
}

// server/vercel/jazz-config.ts
var config = { maxDuration: 15 };
var jazz_config_default = {
  async fetch() {
    return Response.json(jazzClientConfig(), { headers: { "cache-control": "no-store" } });
  }
};
export {
  config,
  jazz_config_default as default
};
