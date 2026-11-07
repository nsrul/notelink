import { afterEach, describe, expect, it } from "vitest";
import { authOptions, authOrigin, tokenIssuer } from "./auth-options.ts";
import { publishedJazzConfig } from "./jazz-public.ts";

const KEYS = [
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
  "VERCEL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VITE_JAZZ_APP_ID",
  "VITE_JAZZ_SERVER_URL",
  "JAZZ_APP_ID",
  "BACKEND_SECRET",
] as const;

const previous = new Map<string, string | undefined>(KEYS.map(key => [key, process.env[key]]));

afterEach(() => {
  for (const key of KEYS) {
    const value = previous.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("auth origin", () => {
  it("uses the local server when no origin is configured", () => {
    delete process.env.BETTER_AUTH_URL;
    delete process.env.VERCEL;
    expect(authOrigin()).toBe("http://127.0.0.1:8870");
    expect(tokenIssuer()).toBe("http://127.0.0.1:8870");
    expect(authOptions().baseURL).toBe("http://127.0.0.1:8870");
  });

  it("strips a trailing slash from an explicit origin", () => {
    delete process.env.VERCEL;
    process.env.BETTER_AUTH_URL = "https://notes.example/";
    expect(authOrigin()).toBe("https://notes.example");
    expect(tokenIssuer()).toBe("https://notes.example");
  });

  it("signs Vercel tokens with the production host and accepts preview hosts", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "notes.example";
    process.env.BETTER_AUTH_SECRET = "notes-test-secret-please-change-me-32chars";
    delete process.env.BETTER_AUTH_URL;
    expect(tokenIssuer()).toBe("https://notes.example");
    const options = authOptions();
    expect(options.baseURL).toEqual({
      allowedHosts: ["*.vercel.app", "notes.nasrul.info", "notes.example"],
      protocol: "https",
      fallback: "https://notes.example",
    });
    expect(options.secret).toBe(process.env.BETTER_AUTH_SECRET);
    expect(options.advanced.trustedProxyHeaders).toBe(true);
  });

  it("keeps the Jazz issuer on the custom domain for vercel.app hosts", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "notes-nnassrulls-projects.vercel.app";
    process.env.BETTER_AUTH_SECRET = "notes-test-secret-please-change-me-32chars";
    expect(tokenIssuer()).toBe("https://notes.nasrul.info");
  });

  it("refuses the dev secret on Vercel", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "notes.example";
    delete process.env.BETTER_AUTH_SECRET;
    expect(() => authOptions()).toThrow(/BETTER_AUTH_SECRET/);
    process.env.BETTER_AUTH_SECRET = "too-short";
    expect(() => authOptions()).toThrow(/BETTER_AUTH_SECRET/);
  });
});

describe("published Jazz config", () => {
  it("returns the public cloud coordinates only", () => {
    expect(publishedJazzConfig({
      VITE_JAZZ_APP_ID: " app ",
      VITE_JAZZ_SERVER_URL: " https://sync.example/ ",
      BACKEND_SECRET: "hidden",
      JAZZ_ADMIN_SECRET: "hidden",
    })).toEqual({
      appId: "app",
      serverUrl: "https://sync.example/",
      env: "prod",
    });
  });

  it("returns null when either public value is missing", () => {
    expect(publishedJazzConfig({})).toBeNull();
    expect(publishedJazzConfig({ VITE_JAZZ_APP_ID: "app" })).toBeNull();
  });
});
