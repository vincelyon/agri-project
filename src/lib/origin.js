/**
 * CSRF defence for Route Handler mutations. Server Actions are already protected
 * by Next.js (Origin/Host comparison); API routes use SameSite=Lax cookies plus
 * this explicit same-origin check for any state-changing request.
 */
export function isSameOrigin(request) {
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
