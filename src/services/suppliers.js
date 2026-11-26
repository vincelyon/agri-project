import { prisma } from "@/lib/db.js";
import { assertCan } from "@/lib/permissions.js";
import { notFound } from "@/lib/errors.js";
import { parseInput, supplierSchema } from "@/lib/validation.js";
import { writeAudit } from "./audit.js";

export async function listSuppliers(actor, { includeArchived = false, search } = {}) {
  assertCan(actor, "catalog:read");
  const where = {};
  if (!includeArchived) where.isActive = true;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  return prisma.supplier.findMany({ where, orderBy: [{ isActive: "desc" }, { name: "asc" }] });
}

export async function getSupplier(actor, id) {
  assertCan(actor, "catalog:read");
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) throw notFound("Supplier not found.");
  return supplier;
}

export async function createSupplier(actor, input) {
  assertCan(actor, "catalog:write");
  const data = parseInput(supplierSchema, input);
  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.create({ data });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "SUPPLIER_CREATED",
      entityType: "Supplier",
      entityId: supplier.id,
      after: data,
    });
    return supplier;
  });
}

export async function updateSupplier(actor, id, input) {
  assertCan(actor, "catalog:write");
  const data = parseInput(supplierSchema, input);
  return prisma.$transaction(async (tx) => {
    const before = await tx.supplier.findUnique({ where: { id } });
    if (!before) throw notFound("Supplier not found.");
    const supplier = await tx.supplier.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone ?? null,
        email: data.email ?? null,
        address: data.address ?? null,
      },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "SUPPLIER_UPDATED",
      entityType: "Supplier",
      entityId: id,
      before: { name: before.name, phone: before.phone, email: before.email, address: before.address },
      after: { name: supplier.name, phone: supplier.phone, email: supplier.email, address: supplier.address },
    });
    return supplier;
  });
}

/** Archive/restore. Past receipts keep their supplier link (M06). */
export async function setSupplierActive(actor, id, isActive) {
  assertCan(actor, "catalog:write");
  return prisma.$transaction(async (tx) => {
    const before = await tx.supplier.findUnique({ where: { id } });
    if (!before) throw notFound("Supplier not found.");
    const supplier = await tx.supplier.update({ where: { id }, data: { isActive } });
    await writeAudit(tx, {
      actorId: actor.id,
      action: isActive ? "SUPPLIER_RESTORED" : "SUPPLIER_ARCHIVED",
      entityType: "Supplier",
      entityId: id,
      before: { isActive: before.isActive },
      after: { isActive },
    });
    return supplier;
  });
}
