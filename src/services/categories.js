import { prisma } from "@/lib/db.js";
import { assertCan } from "@/lib/permissions.js";
import { conflict, notFound } from "@/lib/errors.js";
import { categorySchema, parseInput } from "@/lib/validation.js";
import { writeAudit } from "./audit.js";

async function assertNameFree(db, name, exceptId) {
  const clash = await db.category.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) },
  });
  if (clash) throw conflict("A category with this name already exists.", { name: "Name already in use" });
}

export async function listCategories(actor, { includeArchived = false } = {}) {
  assertCan(actor, "catalog:read");
  const rows = await prisma.category.findMany({
    where: includeArchived ? {} : { isActive: true },
    include: { _count: { select: { products: true } } },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  return rows.map(({ _count, ...c }) => ({ ...c, productCount: _count.products }));
}

export async function getCategory(actor, id) {
  assertCan(actor, "catalog:read");
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw notFound("Category not found.");
  return category;
}

export async function createCategory(actor, input) {
  assertCan(actor, "catalog:write");
  const data = parseInput(categorySchema, input);
  return prisma.$transaction(async (tx) => {
    await assertNameFree(tx, data.name);
    const category = await tx.category.create({ data });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "CATEGORY_CREATED",
      entityType: "Category",
      entityId: category.id,
      after: data,
    });
    return category;
  });
}

export async function updateCategory(actor, id, input) {
  assertCan(actor, "catalog:write");
  const data = parseInput(categorySchema, input);
  return prisma.$transaction(async (tx) => {
    const before = await tx.category.findUnique({ where: { id } });
    if (!before) throw notFound("Category not found.");
    await assertNameFree(tx, data.name, id);
    const category = await tx.category.update({
      where: { id },
      data: { name: data.name, description: data.description ?? null },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "CATEGORY_UPDATED",
      entityType: "Category",
      entityId: id,
      before: { name: before.name, description: before.description },
      after: { name: category.name, description: category.description },
    });
    return category;
  });
}

/** Categories are archived, never hard-deleted (M04). */
export async function setCategoryActive(actor, id, isActive) {
  assertCan(actor, "catalog:write");
  return prisma.$transaction(async (tx) => {
    const before = await tx.category.findUnique({ where: { id } });
    if (!before) throw notFound("Category not found.");
    const category = await tx.category.update({ where: { id }, data: { isActive } });
    await writeAudit(tx, {
      actorId: actor.id,
      action: isActive ? "CATEGORY_RESTORED" : "CATEGORY_ARCHIVED",
      entityType: "Category",
      entityId: id,
      before: { isActive: before.isActive },
      after: { isActive },
    });
    return category;
  });
}
