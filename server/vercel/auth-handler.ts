import { notesBackend } from "../auth.ts";
import { authRequest } from "./auth-request.ts";

export const config = { maxDuration: 30 };

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const { auth } = notesBackend();
      return auth.handler(authRequest(request));
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Auth server is unavailable");
      return Response.json({ error: "Auth server is unavailable" }, { status: 500 });
    }
  },
};
