/** Vercel's file route for `api/auth/[...all]` matches one path segment.
 *  Nested Better Auth paths are rewritten onto that function with the rest of
 *  the path in `__path`. Put the original path back before Better Auth sees it. */
export function authRequest(request: Request): Request {
  const url = new URL(request.url);
  const forwarded = url.searchParams.get("__path");
  if (forwarded == null) return request;
  url.searchParams.delete("__path");
  url.searchParams.delete("...all");
  const suffix = forwarded.replace(/^\/+/, "");
  const restored = suffix ? `/api/auth/${suffix}` : "/api/auth";
  const leaf = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "");
  if (leaf === "[...all]" || url.pathname === restored) {
    if (url.searchParams.get("path") === forwarded) url.searchParams.delete("path");
  }
  if (leaf === "[...all]") url.pathname = restored;
  return new Request(url, request);
}
