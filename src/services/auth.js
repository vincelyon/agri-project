import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db.js";
import { conflict, invalid, ServiceError } from "@/lib/errors.js";
import { changePasswordSchema, loginSchema, parseInput } from "@/lib/validation.js";
import { writeAudit } from "./audit.js";

const BCRYPT_ROUNDS = 12;
// Compared against when the email is unknown so response timing does not reveal it.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

export const hashPassword = (plain) => bcrypt.hash(plain, BCRYPT_ROUNDS);

/** Readable temporary password for new / reset accounts (shown once to the admin). */
export function generateTemporaryPassword(length = 12) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%";
  const bytes = randomBytes(length);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

// Basic brute-force throttle: 5 failures per email within 15 minutes.
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map();

function isLockedOut(key) {
  const entry = failures.get(key);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

function recordFailure(key) {
  const entry = failures.get(key);
  if (!entry || Date.now() - entry.first > WINDOW_MS) {
    failures.set(key, { count: 1, first: Date.now() });
  } else {
    entry.count += 1;
  }
}

export function resetLoginThrottle() {
  failures.clear();
}

const GENERIC_FAILURE = "Incorrect email or password.";

/** Verify credentials. Returns the user on success; throws a generic error otherwise. */
export async function authenticate(input) {
  const { email, password } = parseInput(loginSchema, input);
  const key = email.toLowerCase();

  if (isLockedOut(key)) {
    throw new ServiceError("RATE_LIMITED", "Too many failed attempts. Try again in 15 minutes.");
  }

  const user = await prisma.user.findUnique({ where: { email: key } });
  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !user.isActive || !passwordOk) {
    recordFailure(key);
    await writeAudit(prisma, {
      actorId: user?.id ?? null,
      action: "LOGIN_FAILED",
      entityType: "User",
      entityId: user?.id ?? key,
      after: { email: key, reason: !user ? "unknown" : !user.isActive ? "inactive" : "bad_password" },
    });
    throw new ServiceError("INVALID_CREDENTIALS", GENERIC_FAILURE);
  }

  failures.delete(key);
  await writeAudit(prisma, {
    actorId: user.id,
    action: "LOGIN",
    entityType: "User",
    entityId: user.id,
  });
  return user;
}

export async function recordLogout(user) {
  await writeAudit(prisma, {
    actorId: user.id,
    action: "LOGOUT",
    entityType: "User",
    entityId: user.id,
  });
}

export async function changeOwnPassword(actor, input) {
  const data = parseInput(changePasswordSchema, input);
  const user = await prisma.user.findUnique({ where: { id: actor.id } });
  if (!user || !(await bcrypt.compare(data.currentPassword, user.passwordHash))) {
    throw invalid("Current password is incorrect.", { currentPassword: "Current password is incorrect." });
  }
  if (data.currentPassword === data.newPassword) {
    throw conflict("Choose a password different from the current one.", {
      newPassword: "Choose a password different from the current one.",
    });
  }
  const passwordHash = await hashPassword(data.newPassword);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: actor.id },
      data: { passwordHash, mustChangePassword: false },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "PASSWORD_CHANGED",
      entityType: "User",
      entityId: actor.id,
    });
  });
}
