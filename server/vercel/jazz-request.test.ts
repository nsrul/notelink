import { describe, expect, it } from "vitest";
import { jazzRequest } from "./jazz-request.ts";

describe("jazz request path", () => {
  it("restores a nested path rewritten onto the one-segment function", () => {
    const request = jazzRequest(new Request("https://notes.nasrul.info/api/jazz/[...all]?__path=apps/local/accounts/backend-sign-in&path=apps/local/accounts/backend-sign-in"));
    const url = new URL(request.url);
    expect(url.pathname).toBe("/jazz/apps/local/accounts/backend-sign-in");
    expect(url.search).toBe("");
  });

  it("keeps a path Vercel already delivered and drops the dispatch query", () => {
    const request = jazzRequest(new Request("https://notes.nasrul.info/jazz/apps/local/ws?__path=apps/local/ws&path=apps/local/ws&cursor=1"));
    const url = new URL(request.url);
    expect(url.pathname).toBe("/jazz/apps/local/ws");
    expect(url.searchParams.get("cursor")).toBe("1");
    expect(url.searchParams.has("__path")).toBe(false);
    expect(url.searchParams.has("path")).toBe(false);
  });

  it("leaves a request without a dispatch query alone", () => {
    const request = jazzRequest(new Request("https://notes.nasrul.info/jazz/apps/local/accounts/backend-user"));
    expect(new URL(request.url).pathname).toBe("/jazz/apps/local/accounts/backend-user");
  });
});
