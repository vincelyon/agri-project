import { prisma } from "@/lib/db.js";
import { assertCan } from "@/lib/permissions.js";
import { conflict, notFound } from "@/lib/errors.js";
import { parseInput, userCreateSchema, userUpdateSchema } from "@/lib/validation.js";
import { writeAudit } from "./audit.js";
import { generateTemporaryPassword, hashPassword } from "./auth.js";

const publicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
};

export async function listUsers(actor) {
  assertCan(actor, "users:manage");
  return prisma.user.findMany({ select: publicSelect, orderBy: [{ isActive: "desc" }, { name: "asc" }] });
}

export async function getUser(actor, id) {
  assertCan(actor, "users:manage");
  const user = await prisma.user.findUnique({ where: { id }, select: publicSelect });
  if (!user) throw notFound("User not found.");
  return user;
}

export async function createUser(actor, input) {
  assertCan(actor, "users:manage");
  const data = parseInput(userCreateSchema, input);
  const email = data.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) {
    throw conflict("A user with this email already exists.", { email: "Email already in use" });
  }
  const temporaryPassword = data.password ?? generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: data.name,
        email,
        role: data.role,
        passwordHash,
        mustChangePassword: true, // new accounts must pick their own password
      },
      select: publicSelect,
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "USER_CREATED",
      entityType: "User",
      entityId: created.id,
      after: { name: created.name, email: created.email, role: created.role },
    });
    return created;
  });
  return { ...user, temporaryPassword };
}

/** Admin reset: generates a new temporary password the user must change at next sign-in. */
export async function resetUserPassword(actor, id) {
  assertCan(actor, "users:manage");
  const temporaryPassword = generateTemporaryPassword();
  await updateUser(actor, id, { password: temporaryPassword });
  return { temporaryPassword };
}

export async function updateUser(actor, id, input) {
  assertCan(actor, "users:manage");
  const data = parseInput(userUpdateSchema, input);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { id }, select: publicSelect });
    if (!existing) throw notFound("User not found.");

    const losesAdmin =
      existing.role === "ADMIN" &&
      existing.isActive &&
      ((data.role && data.role !== "ADMIN") || data.isActive === false);
    if (losesAdmin) {
      if (id === actor.id) {
        throw conflict("You cannot demote or deactivate your own account.");
      }
      const otherAdmins = await tx.user.count({
        where: { role: "ADMIN", isActive: true, id: { not: id } },
      });
      if (otherAdmins === 0) throw conflict("At least one active administrator is required.");
    }

    const update = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.role !== undefined) update.role = data.role;
    if (data.isActive !== undefined) update.isActive = data.isActive;
    if (data.password) {
      update.passwordHash = await hashPassword(data.password);
      update.mustChangePassword = true; // admin-reset passwords are temporary
    }

    const user = await tx.user.update({ where: { id }, data: update, select: publicSelect });
    await writeAudit(tx, {
      actorId: actor.id,
      action: data.password ? "USER_UPDATED_PASSWORD_RESET" : "USER_UPDATED",
      entityType: "User",
      entityId: id,
      before: { name: existing.name, role: existing.role, isActive: existing.isActive },
      after: { name: user.name, role: user.role, isActive: user.isActive },
    });
    return user;
  });
}
