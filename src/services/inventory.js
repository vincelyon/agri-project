import { prisma } from "@/lib/db.js";
import { assertCan } from "@/lib/permissions.js";
import { conflict, invalid, notFound } from "@/lib/errors.js";
import {
  adjustmentSchema,
  dateRangeSchema,
  issueSchema,
  parseInput,
  receiptSchema,
  reversalSchema,
} from "@/lib/validation.js";
import { reversalType, stockStatus, valuationBasis, multiplyMoney } from "@/lib/stock.js";
import { writeAudit } from "./audit.js";

export const MOVEMENT_PAGE_SIZE = 25;

/* -------------------------------------------------------------------------- */
/* Transaction core                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Resolve a date-only input to a timestamp. Today's date uses the current time
 * of day; future dates are rejected.
 */
export function resolveOccurredAt(date, now = new Date()) {
  if (!date) return now;
  const d = new Date(date);
  // <input type="date"> yields UTC midnight of the chosen calendar day.
  const resolved = new Date(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  );
  if (resolved.getTime() > now.getTime()) {
    throw invalid("The date cannot be in the future.", { occurredAt: "Date cannot be in the future" });
  }
  return resolved;
}

async function increaseBalance(tx, productId, quantity) {
  const { count } = await tx.stockBalance.updateMany({
    where: { productId },
    data: { quantityOnHand: { increment: quantity } },
  });
  if (count === 0) {
    await tx.stockBalance.create({ data: { productId, quantityOnHand: quantity } });
  }
}

/**
 * Atomic conditional decrement (BR-04). The WHERE clause makes PostgreSQL lock
 * the row and re-check availability, so two concurrent issues can never drive
 * the balance below zero.
 */
async function decreaseBalance(tx, productId, quantity) {
  const { count } = await tx.stockBalance.updateMany({
    where: { productId, quantityOnHand: { gte: quantity } },
    data: { quantityOnHand: { decrement: quantity } },
  });
  if (count === 0) {
    const balance = await tx.stockBalance.findUnique({ where: { productId } });
    const available = balance?.quantityOnHand ?? 0;
    throw conflict(`Insufficient stock: only ${available} available.`, {
      quantity: `Only ${available} available`,
    });
  }
}

/**
 * Record one ledger movement and update the materialised balance in the same
 * transaction. Everything stock-related funnels through here.
 */
async function applyMovement(tx, actor, m) {
  if (m.type === "IN" || m.type === "ADJUST_IN") {
    await increaseBalance(tx, m.productId, m.quantity);
  } else {
    await decreaseBalance(tx, m.productId, m.quantity);
  }
  const movement = await tx.stockMovement.create({
    data: { ...m, performedById: actor.id },
    include: { product: true },
  });
  const balance = await tx.stockBalance.findUnique({ where: { productId: m.productId } });
  await writeAudit(tx, {
    actorId: actor.id,
    action: auditAction(m),
    entityType: "StockMovement",
    entityId: movement.id,
    after: {
      productId: m.productId,
      sku: movement.product.sku,
      type: m.type,
      quantity: m.quantity,
      balanceAfter: balance.quantityOnHand,
      reference: m.reference ?? null,
      reason: m.reason ?? null,
      reversalOfId: m.reversalOfId ?? null,
    },
  });
  return { id: movement.id, balanceAfter: balance.quantityOnHand };
}

function auditAction(m) {
  if (m.reversalOfId) return "MOVEMENT_REVERSED";
  return { IN: "STOCK_IN", OUT: "STOCK_OUT", ADJUST_IN: "STOCK_ADJUSTED", ADJUST_OUT: "STOCK_ADJUSTED" }[m.type];
}

async function loadActiveProduct(tx, productId) {
  const product = await tx.product.findUnique({ where: { id: productId } });
  if (!product) throw notFound("Product not found.");
  if (!product.isActive) {
    throw invalid("This product is archived and cannot receive stock movements.", {
      productId: "Product is archived",
    });
  }
  return product;
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                  */
/* -------------------------------------------------------------------------- */

/** M07 – goods receipt. */
export async function receiveStock(actor, input) {
  assertCan(actor, "stock:receive");
  const data = parseInput(receiptSchema, input);
  const occurredAt = resolveOccurredAt(data.occurredAt);

  return prisma.$transaction(async (tx) => {
    await loadActiveProduct(tx, data.productId);
    if (data.supplierId) {
      const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId } });
      if (!supplier || !supplier.isActive) {
        throw invalid("Choose an active supplier.", { supplierId: "Choose an active supplier" });
      }
    }
    return applyMovement(tx, actor, {
      productId: data.productId,
      type: "IN",
      quantity: data.quantity,
      unitCost: data.unitCost ?? null,
      supplierId: data.supplierId ?? null,
      reference: data.reference ?? null,
      notes: data.notes ?? null,
      occurredAt,
    });
  });
}

/** M08 – stock-out (sale or issue). */
export async function issueStock(actor, input) {
  assertCan(actor, "stock:issue");
  const data = parseInput(issueSchema, input);
  const occurredAt = resolveOccurredAt(data.occurredAt);

  return prisma.$transaction(async (tx) => {
    await loadActiveProduct(tx, data.productId);
    return applyMovement(tx, actor, {
      productId: data.productId,
      type: "OUT",
      quantity: data.quantity,
      issueType: data.issueType,
      recipient: data.recipient ?? null,
      reference: data.reference ?? null,
      notes: data.notes ?? null,
      occurredAt,
    });
  });
}

/** M09 – admin stock adjustment with a mandatory reason. */
export async function adjustStock(actor, input) {
  assertCan(actor, "stock:adjust");
  const data = parseInput(adjustmentSchema, input);

  return prisma.$transaction(async (tx) => {
    await loadActiveProduct(tx, data.productId);
    return applyMovement(tx, actor, {
      productId: data.productId,
      type: data.direction === "IN" ? "ADJUST_IN" : "ADJUST_OUT",
      quantity: data.quantity,
      reference: data.reference ?? null,
      reason: data.reason,
      occurredAt: new Date(),
    });
  });
}

/**
 * BR-07 – past movements are never edited. A mistake is corrected by posting a
 * compensating adjustment linked to the original, with a reason.
 */
export async function reverseMovement(actor, movementId, input) {
  assertCan(actor, "stock:reverse");
  const { reason } = parseInput(reversalSchema, input);

  return prisma.$transaction(async (tx) => {
    const original = await tx.stockMovement.findUnique({
      where: { id: movementId },
      include: { reversedBy: true },
    });
    if (!original) throw notFound("Movement not found.");
    if (original.reversalOfId) throw conflict("A reversal entry cannot itself be reversed.");
    if (original.reversedBy) throw conflict("This movement has already been reversed.");

    try {
      return await applyMovement(tx, actor, {
        productId: original.productId,
        type: reversalType(original.type),
        quantity: original.quantity,
        reference: `REV-${original.id}`,
        reason,
        reversalOfId: original.id,
        occurredAt: new Date(),
      });
    } catch (err) {
      if (err?.code === "P2002") throw conflict("This movement has already been reversed.");
      throw err;
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                      */
/* -------------------------------------------------------------------------- */

/** Latest recorded unit cost per product, from IN movements (BR-08). */
async function latestCosts(db, productIds) {
  if (productIds.length === 0) return new Map();
  const rows = await db.stockMovement.findMany({
    where: { type: "IN", unitCost: { not: null }, productId: { in: productIds } },
    orderBy: [{ productId: "asc" }, { occurredAt: "desc" }, { id: "desc" }],
    distinct: ["productId"],
    select: { productId: true, unitCost: true },
  });
  return new Map(rows.map((r) => [r.productId, r.unitCost.toString()]));
}

/**
 * Inventory rows for all products with balance, status and valuation.
 * Filtering by status happens here because it compares two columns.
 */
export async function listInventory(
  actor,
  { search, categoryId, status, includeArchived = false } = {},
) {
  assertCan(actor, "inventory:read");
  const where = {};
  if (!includeArchived) where.isActive = true;
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }
  const products = await prisma.product.findMany({
    where,
    include: { category: true, balance: true },
    orderBy: { name: "asc" },
  });
  const costs = await latestCosts(
    prisma,
    products.map((p) => p.id),
  );

  const rows = products.map((p) => {
    const onHand = p.balance?.quantityOnHand ?? 0;
    const { unitCost, basis } = valuationBasis({
      latestUnitCost: costs.get(p.id) ?? null,
      buyingPrice: p.buyingPrice?.toString() ?? null,
    });
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      categoryId: p.categoryId,
      categoryName: p.category.name,
      unit: p.unit,
      reorderLevel: p.reorderLevel,
      isActive: p.isActive,
      onHand,
      status: stockStatus(onHand, p.reorderLevel),
      unitCost,
      costBasis: basis,
      value: multiplyMoney(unitCost, onHand),
    };
  });
  return status ? rows.filter((r) => r.status === status) : rows;
}

/** M10 – low-stock and out-of-stock products, most urgent first. */
export async function listAlerts(actor) {
  assertCan(actor, "inventory:read");
  const rows = await listInventory(actor);
  return rows
    .filter((r) => r.status !== "NORMAL")
    .sort((a, b) => (a.status === b.status ? a.onHand - b.onHand : a.status === "OUT" ? -1 : 1));
}

function movementWhere(filters) {
  const where = {};
  if (filters.productId) where.productId = filters.productId;
  if (filters.type) where.type = filters.type;
  if (filters.from || filters.to) {
    where.occurredAt = {};
    if (filters.from) where.occurredAt.gte = startOfDay(filters.from);
    if (filters.to) where.occurredAt.lte = endOfDay(filters.to);
  }
  return where;
}

// Date inputs arrive as UTC midnight of the chosen calendar day; interpret in local time.
function startOfDay(d) {
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
}
function endOfDay(d) {
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999);
}

const movementInclude = {
  product: { select: { id: true, sku: true, name: true, unit: true } },
  supplier: { select: { id: true, name: true } },
  performedBy: { select: { id: true, name: true } },
  reversedBy: { select: { id: true } },
};

function serializeMovement(m) {
  return {
    id: m.id,
    productId: m.productId,
    sku: m.product.sku,
    productName: m.product.name,
    unit: m.product.unit,
    type: m.type,
    quantity: m.quantity,
    unitCost: m.unitCost?.toString() ?? null,
    supplierName: m.supplier?.name ?? null,
    issueType: m.issueType,
    recipient: m.recipient,
    reference: m.reference,
    notes: m.notes,
    reason: m.reason,
    reversalOfId: m.reversalOfId,
    isReversed: Boolean(m.reversedBy),
    performedByName: m.performedBy.name,
    occurredAt: m.occurredAt,
  };
}

/** Paginated movement history. */
export async function listMovements(actor, rawFilters = {}, { page = 1, pageSize = MOVEMENT_PAGE_SIZE } = {}) {
  assertCan(actor, "history:read");
  const filters = parseInput(dateRangeSchema, rawFilters);
  const where = movementWhere(filters);
  const [rows, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: movementInclude,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: pageSize,
      skip: (Math.max(1, page) - 1) * pageSize,
    }),
    prisma.stockMovement.count({ where }),
  ]);
  return { rows: rows.map(serializeMovement), total, page, pageSize };
}

/** All movements matching the filters (for reports and CSV). */
export async function listAllMovements(actor, rawFilters = {}, permission = "history:read") {
  assertCan(actor, permission);
  const filters = parseInput(dateRangeSchema, rawFilters);
  const rows = await prisma.stockMovement.findMany({
    where: movementWhere(filters),
    include: movementInclude,
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
  });
  return rows.map(serializeMovement);
}

/** Latest receipts or issues for the stock-in / stock-out pages. */
export async function recentMovements(actor, types, take = 10) {
  assertCan(actor, "history:read");
  const rows = await prisma.stockMovement.findMany({
    where: { type: { in: types } },
    include: movementInclude,
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take,
  });
  return rows.map(serializeMovement);
}

/** M03 – dashboard figures, all derived from the same ledger-backed balances. */
export async function getDashboard(actor) {
  assertCan(actor, "inventory:read");
  const now = new Date();
  const dayMs = 86400000;
  const startOfLocalDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = startOfLocalDay(now);
  const weekAgo = new Date(today.getTime() - 7 * dayMs);
  const twoWeeksAgo = new Date(today.getTime() - 14 * dayMs);
  const sparkStart = new Date(today.getTime() - 6 * dayMs);

  const [rows, recent, recentWindow] = await Promise.all([
    listInventory(actor),
    prisma.stockMovement.findMany({
      include: movementInclude,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: 8,
    }),
    prisma.stockMovement.findMany({
      where: { occurredAt: { gte: twoWeeksAgo } },
      select: { productId: true, type: true, quantity: true, occurredAt: true },
      orderBy: { occurredAt: "asc" },
    }),
  ]);

  // Reconstruct each product's on-hand 7 days ago by reversing movements since then.
  const deltaSinceWeekAgo = new Map();
  for (const m of recentWindow) {
    if (m.occurredAt < weekAgo) continue;
    const sign = m.type === "IN" || m.type === "ADJUST_IN" ? 1 : -1;
    deltaSinceWeekAgo.set(m.productId, (deltaSinceWeekAgo.get(m.productId) ?? 0) + sign * m.quantity);
  }

  const prevStatus = { NORMAL: 0, LOW: 0, OUT: 0 };
  for (const r of rows) {
    const prevOnHand = Math.max(0, r.onHand - (deltaSinceWeekAgo.get(r.id) ?? 0));
    prevStatus[stockStatus(prevOnHand, r.reorderLevel)] += 1;
  }

  const byStatus = [
    { key: "NORMAL", label: "Normal", count: rows.filter((r) => r.status === "NORMAL").length, color: "slate" },
    { key: "LOW", label: "Low stock", count: rows.filter((r) => r.status === "LOW").length, color: "amber" },
    { key: "OUT", label: "Out of stock", count: rows.filter((r) => r.status === "OUT").length, color: "rose" },
  ];

  const categoryMap = new Map();
  for (const r of rows) {
    const row = categoryMap.get(r.categoryName) ?? { category: r.categoryName, products: 0, units: 0, value: 0 };
    row.products += 1;
    row.units += r.onHand;
    row.value += r.value;
    categoryMap.set(r.categoryName, row);
  }
  const byCategory = [...categoryMap.values()].sort((a, b) => b.units - a.units);

  // Daily movement counts for sparklines (last 7 calendar days, oldest → newest).
  const dayKey = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const sparkDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(sparkStart.getTime() + i * dayMs);
    return { key: dayKey(day), label: day.toLocaleDateString("en-GB", { weekday: "short" }), count: 0, unitsIn: 0, unitsOut: 0 };
  });
  const sparkIndex = new Map(sparkDays.map((d, i) => [d.key, i]));
  for (const m of recentWindow) {
    if (m.occurredAt < sparkStart) continue;
    const key = dayKey(startOfLocalDay(new Date(m.occurredAt)));
    const idx = sparkIndex.get(key);
    if (idx == null) continue;
    sparkDays[idx].count += 1;
    if (m.type === "IN" || m.type === "ADJUST_IN") sparkDays[idx].unitsIn += m.quantity;
    else sparkDays[idx].unitsOut += m.quantity;
  }

  const sumIn = (from, to) =>
    recentWindow
      .filter((m) => m.occurredAt >= from && m.occurredAt < to && (m.type === "IN" || m.type === "ADJUST_IN"))
      .reduce((s, m) => s + m.quantity, 0);
  const sumOut = (from, to) =>
    recentWindow
      .filter((m) => m.occurredAt >= from && m.occurredAt < to && (m.type === "OUT" || m.type === "ADJUST_OUT"))
      .reduce((s, m) => s + m.quantity, 0);

  const thisWeekIn = sumIn(weekAgo, new Date(today.getTime() + dayMs));
  const lastWeekIn = sumIn(twoWeeksAgo, weekAgo);
  const thisWeekOut = sumOut(weekAgo, new Date(today.getTime() + dayMs));
  const lastWeekOut = sumOut(twoWeeksAgo, weekAgo);

  const pctChange = (current, previous) => {
    if (previous === 0) return current === 0 ? 0 : 100;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  };

  const totalUnits = rows.reduce((s, r) => s + r.onHand, 0);
  const prevTotalUnits = rows.reduce((s, r) => s + Math.max(0, r.onHand - (deltaSinceWeekAgo.get(r.id) ?? 0)), 0);
  const lowStock = byStatus.find((s) => s.key === "LOW").count;
  const outOfStock = byStatus.find((s) => s.key === "OUT").count;

  return {
    activeProducts: rows.length,
    totalUnits,
    lowStock,
    outOfStock,
    stockValue: rows.reduce((s, r) => s + r.value, 0),
    byStatus,
    byCategory,
    sparkDays,
    kpis: [
      {
        key: "products",
        label: "Active products",
        value: rows.length,
        change: pctChange(thisWeekIn + thisWeekOut, lastWeekIn + lastWeekOut),
        changeLabel: "activity vs last week",
        spark: sparkDays.map((d) => d.count),
        tone: "default",
        href: "/products",
      },
      {
        key: "units",
        label: "Units on hand",
        value: totalUnits,
        change: pctChange(totalUnits, prevTotalUnits),
        spark: sparkDays.map((d) => d.unitsIn - d.unitsOut),
        tone: "info",
        href: "/inventory",
      },
      {
        key: "low",
        label: "Low stock",
        value: lowStock,
        change: pctChange(lowStock, prevStatus.LOW),
        spark: sparkDays.map((d) => d.unitsOut),
        tone: "warn",
        href: "/inventory?status=LOW",
      },
      {
        key: "out",
        label: "Out of stock",
        value: outOfStock,
        change: pctChange(outOfStock, prevStatus.OUT),
        spark: sparkDays.map((d) => d.count),
        tone: "danger",
        href: "/inventory?status=OUT",
      },
    ],
    activity: {
      thisWeekIn,
      lastWeekIn,
      thisWeekOut,
      lastWeekOut,
      inChange: pctChange(thisWeekIn, lastWeekIn),
      outChange: pctChange(thisWeekOut, lastWeekOut),
    },
    alerts: rows
      .filter((r) => r.status !== "NORMAL")
      .sort((a, b) => (a.status === b.status ? a.onHand - b.onHand : a.status === "OUT" ? -1 : 1)),
    recentMovements: recent.map(serializeMovement),
  };
}
