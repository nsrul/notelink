import { createAuthClient } from "better-auth/react";
import { jwtClient } from "better-auth/client/plugins";

/** Better Auth's browser client. It shares the app's origin by default, so the
 *  session cookie and `/api/auth` routes stay same-site. */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL?.trim()
    || (typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:8870"),
  plugins: [jwtClient()],
});
