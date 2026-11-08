import { betterAuth } from "better-auth";
import { schema as s } from "jazz-tools";
import { jazzAdapter } from "jazz-tools/better-auth-adapter";
import { authOptions } from "./auth-options.ts";

/** Generation-only config. It never opens a Jazz session, so the Better Auth CLI
 *  can read the table shape before the sync server or merged app schema exists. */
export const auth = betterAuth({
  ...authOptions(),
  database: jazzAdapter({
    db: async () => {
      throw new Error("The generation config cannot query the database");
    },
    schema: s.defineApp({}, { migrations: "none" }).wasmSchema,
  }),
});
