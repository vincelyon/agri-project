// Edge-safe session token helpers (used by both middleware and server code).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "agri_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // sessions expire after 8 hours

function getKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be set to a long random string (see .env.example).");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(userId) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getKey());
}

/** Returns the user id from a valid, unexpired token; otherwise null. */
export async function verifySession(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    return Number.isInteger(id) ? id : null;
  } catch {
    return null;
  }
}
