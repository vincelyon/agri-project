import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db.js";
import { can } from "./permissions.js";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSession, verifySession } from "./session.js";

export async function createSession(userId) {
  const token = await signSession(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Resolve the signed-in user from the session cookie. The database is checked on
 * every request, so deactivating an account takes effect immediately.
 */
export const getCurrentUser = cache(async () => {
  const store = await cookies();
  const userId = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, isActive: true, mustChangePassword: true },
  });
  if (!user || !user.isActive) return null;
  return user;
});

/** For pages: redirect to /login if not signed in. */
export async function requireUser({ allowPasswordChange = false } = {}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword && !allowPasswordChange) redirect("/change-password");
  return user;
}

/** For pages: redirect away if the user lacks a permission. */
export async function requirePermission(permission) {
  const user = await requireUser();
  if (!can(user, permission)) redirect("/forbidden");
  return user;
}
