import { prisma } from "@/lib/db.js";
import { assertCan } from "@/lib/permissions.js";
import { conflict, invalid, notFound } from "@/lib/errors.js";
import { productCreateSchema, productSchema, parseInput } from "@/lib/validation.js";
import { stockStatus } from "@/lib/stock.js";
import { writeAudit } from "./audit.js";

export const PRODUCT_PAGE_SIZE = 25;

/** Convert a DB product (with Decimal prices and balance) into a plain, serialisable object. */
export function serializeProduct(p) {
  const onHand = p.balance?.quantityOnHand ?? 0;
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    categoryId: p.categoryId,
    categoryName: p.category?.name,
    unit: p.unit,
    reorderLevel: p.reorderLevel,
    buyingPrice: p.buyingPrice == null ? null : p.buyingPrice.toString(),
    sellingPrice: p.sellingPrice == null ? null : p.sellingPrice.toString(),
    isActive: p.isActive,
    onHand,
    status: stockStatus(onHand, p.reorderLevel),
  };
}

async function assertSkuFree(db, sku, exceptId) {
  const clash = await db.product.findFirst({
    where: { sku: { equals: sku, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) },
  });
  if (clash) throw conflict("A product with this SKU already exists.", { sku: "SKU already in use" });
}

async function assertCategoryUsable(db, categoryId, currentCategoryId) {
  const category = await db.category.findUnique({ where: { id: categoryId } });
  if (!category) throw invalid("Choose a valid category.", { categoryId: "Choose a valid category" });
  if (!category.isActive && categoryId !== currentCategoryId) {
    throw invalid("That category is archived.", { categoryId: "Category is archived" });
  }
}

export async function listProducts(
  actor,
  { search, categoryId, status = "active", page = 1, pageSize = PRODUCT_PAGE_SIZE } = {},
) {
  assertCan(actor, "catalog:read");
  const where = {};
  if (status === "active") where.isActive = true;
  if (status === "archived") where.isActive = false;
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, balance: true },
      orderBy: { name: "asc" },
      take: pageSize,
      skip: (Math.max(1, page) - 1) * pageSize,
    }),
    prisma.product.count({ where }),
  ]);
  return { rows: rows.map(serializeProduct), total, page, pageSize };
}

/** Lightweight list for dropdowns on stock forms. */
export async function listProductOptions(actor) {
  assertCan(actor, "catalog:read");
  const rows = await prisma.product.findMany({
    where: { isActive: true },
    include: { balance: true },
    orderBy: { name: "asc" },
  });
  return rows.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    unit: p.unit,
    onHand: p.balance?.quantityOnHand ?? 0,
  }));
}

export async function getProduct(actor, id) {
  assertCan(actor, "catalog:read");
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, balance: true },
  });
  if (!product) throw notFound("Product not found.");
  return serializeProduct(product);
}

/**
 * Create a product. A non-zero opening quantity is recorded as an initial IN
 * movement so the ledger stays the single source of truth (M05).
 */
export async function createProduct(actor, input) {
  assertCan(actor, "catalog:write");
  const data = parseInput(productCreateSchema, input);
  const { openingQuantity = 0, ...fields } = data;

  return prisma.$transaction(async (tx) => {
    await assertSkuFree(tx, fields.sku);
    await assertCategoryUsable(tx, fields.categoryId);

    const product = await tx.product.create({
      data: { ...fields, balance: { create: { quantityOnHand: openingQuantity } } },
      include: { category: true, balance: true },
    });

    if (openingQuantity > 0) {
      const movement = await tx.stockMovement.create({
        data: {
          productId: product.id,
          type: "IN",
          quantity: openingQuantity,
          unitCost: fields.buyingPrice ?? null,
          reference: "OPENING",
          notes: "Opening stock",
          performedById: actor.id,
        },
      });
      await writeAudit(tx, {
        actorId: actor.id,
        action: "STOCK_IN",
        entityType: "StockMovement",
        entityId: movement.id,
        after: { productId: product.id, quantity: openingQuantity, reference: "OPENING" },
      });
    }

    await writeAudit(tx, {
      actorId: actor.id,
      action: "PRODUCT_CREATED",
      entityType: "Product",
      entityId: product.id,
      after: { ...fields, openingQuantity },
    });
    return serializeProduct(product);
  });
}

/** Update catalog fields. Quantities are never edited here; use stock movements. */
export async function updateProduct(actor, id, input) {
  assertCan(actor, "catalog:write");
  const data = parseInput(productSchema, input);

  return prisma.$transaction(async (tx) => {
    const before = await tx.product.findUnique({ where: { id } });
    if (!before) throw notFound("Product not found.");
    await assertSkuFree(tx, data.sku, id);
    await assertCategoryUsable(tx, data.categoryId, before.categoryId);

    const product = await tx.product.update({
      where: { id },
      data: {
        sku: data.sku,
        name: data.name,
        categoryId: data.categoryId,
        unit: data.unit,
        reorderLevel: data.reorderLevel,
        buyingPrice: data.buyingPrice ?? null,
        sellingPrice: data.sellingPrice ?? null,
      },
      include: { category: true, balance: true },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "PRODUCT_UPDATED",
      entityType: "Product",
      entityId: id,
      before: pickEditable(before),
      after: pickEditable(product),
    });
    return serializeProduct(product);
  });
}

function pickEditable(p) {
  return {
    sku: p.sku,
    name: p.name,
    categoryId: p.categoryId,
    unit: p.unit,
    reorderLevel: p.reorderLevel,
    buyingPrice: p.buyingPrice?.toString() ?? null,
    sellingPrice: p.sellingPrice?.toString() ?? null,
  };
}

/** Archive/restore. Products with movements are never deleted (M05, BR-06). */
export async function setProductActive(actor, id, isActive) {
  assertCan(actor, "catalog:write");
  return prisma.$transaction(async (tx) => {
    const before = await tx.product.findUnique({ where: { id } });
    if (!before) throw notFound("Product not found.");
    await tx.product.update({ where: { id }, data: { isActive } });
    await writeAudit(tx, {
      actorId: actor.id,
      action: isActive ? "PRODUCT_RESTORED" : "PRODUCT_ARCHIVED",
      entityType: "Product",
      entityId: id,
      before: { isActive: before.isActive },
      after: { isActive },
    });
  });
}
