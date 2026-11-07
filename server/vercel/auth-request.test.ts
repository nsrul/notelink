import { describe, expect, it } from "vitest";
import { authRequest } from "./auth-request.ts";

describe("auth request path", () => {
  it("restores a nested path rewritten onto the one-segment function", () => {
    const request = authRequest(new Request("https://notes.nasrul.info/api/auth/[...all]?__path=sign-up/email&path=sign-up/email"));
    const url = new URL(request.url);
    expect(url.pathname).toBe("/api/auth/sign-up/email");
    expect(url.search).toBe("");
  });

  it("keeps a path Vercel already delivered and drops the dispatch query", () => {
    const request = authRequest(new Request("https://notes.nasrul.info/api/auth/sign-up/email?__path=sign-up/email&path=sign-up/email&callbackURL=%2F"));
    const url = new URL(request.url);
    expect(url.pathname).toBe("/api/auth/sign-up/email");
    expect(url.searchParams.get("callbackURL")).toBe("/");
    expect(url.searchParams.has("__path")).toBe(false);
    expect(url.searchParams.has("path")).toBe(false);
  });

  it("leaves a direct one-segment route alone", () => {
    const request = authRequest(new Request("https://notes.nasrul.info/api/auth/ok"));
    expect(new URL(request.url).pathname).toBe("/api/auth/ok");
  });
});
