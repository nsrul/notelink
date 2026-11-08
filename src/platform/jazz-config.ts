/** Whether this host admits accounts. A static build has no such route, so
 *  the notebook stays in this browser. */
export async function jazzBackendEnabled(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const response = await fetch("/api/jazz-config");
    if (!response.ok) return false;
    const body = await response.json() as { enabled?: unknown };
    return body.enabled === true;
  } catch {
    return false;
  }
}
