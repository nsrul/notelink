/** Vercel's file route for `api/jazz/[...all]` matches one path segment.
 *  Nested Jazz paths are rewritten onto that function with the rest of the
 *  path in `__path`. Put the original path back before Jazz sees it. */
export function jazzRequest(request: Request): Request {
  const url = new URL(request.url);
  const forwarded = url.searchParams.get("__path");
  if (forwarded == null) return request;
  url.searchParams.delete("__path");
  url.searchParams.delete("...all");
  const suffix = forwarded.replace(/^\/+/, "");
  const restored = suffix ? `/jazz/${suffix}` : "/jazz";
  const leaf = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "");
  if (leaf === "[...all]" || url.pathname === restored || url.pathname.startsWith("/jazz")) {
    if (url.searchParams.get("path") === forwarded) url.searchParams.delete("path");
  }
  if (leaf === "[...all]" || !url.pathname.startsWith("/jazz")) url.pathname = restored;
  return new Request(url, request);
}
