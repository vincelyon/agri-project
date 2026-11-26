import { assertCan, can } from "@/lib/permissions.js";
import { forbidden } from "@/lib/errors.js";
import { getSettings } from "./settings.js";
import { listAllMovements, listInventory } from "./inventory.js";

export const COST_BASIS_LABELS = {
  LATEST_COST: "Latest recorded unit cost",
  CONFIGURED_PRICE: "Configured buying price",
  NONE: "No cost recorded (valued at 0)",
};

/** Admins always; staff only when the admin enabled it in settings. */
export async function canViewReports(actor) {
  if (!actor || !actor.isActive) return false;
  if (can(actor, "reports:read")) return true;
  const settings = await getSettings();
  return Boolean(settings.staffCanViewReports);
}

async function assertReportAccess(actor) {
  assertCan(actor, "inventory:read"); // must be signed in and active
  if (!(await canViewReports(actor))) throw forbidden("Reports are restricted to administrators.");
}

const dayKey = (d) => {
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};

/** Stock-on-hand summary with valuation (BR-08: labelled cost basis). */
export async function stockOnHandReport(actor, filters = {}) {
  await assertReportAccess(actor);
  const rows = await listInventory(actor, { ...filters, includeArchived: true });
  return {
    rows,
    totals: {
      products: rows.length,
      units: rows.reduce((s, r) => s + r.onHand, 0),
      value: rows.reduce((s, r) => s + r.value, 0),
    },
    valuationNote:
      "Valuation = current on-hand × latest recorded unit cost (falls back to the product's configured buying price).",
  };
}

export async function lowStockReport(actor) {
  await assertReportAccess(actor);
  const rows = (await listInventory(actor, { includeArchived: false })).filter((r) => r.status !== "NORMAL");
  rows.sort((a, b) => a.onHand - b.onHand);
  return { rows, totals: { products: rows.length } };
}

/** Movement register with totals that reconcile with the listed rows. */
export async function movementRegister(actor, filters = {}) {
  await assertReportAccess(actor);
  const rows = await listAllMovements(actor, filters);
  const sum = (types) =>
    rows.filter((r) => types.includes(r.type)).reduce((s, r) => s + r.quantity, 0);
  return {
    rows,
    totals: {
      count: rows.length,
      stockIn: sum(["IN"]),
      stockOut: sum(["OUT"]),
      adjustedUp: sum(["ADJUST_IN"]),
      adjustedDown: sum(["ADJUST_OUT"]),
      net: sum(["IN", "ADJUST_IN"]) - sum(["OUT", "ADJUST_OUT"]),
    },
  };
}

/** Receipts and issues grouped by calendar day. */
export async function dailyActivityReport(actor, filters = {}) {
  await assertReportAccess(actor);
  const movements = await listAllMovements(actor, filters);
  const byDay = new Map();
  for (const m of movements) {
    const key = dayKey(m.occurredAt);
    const row = byDay.get(key) ?? { date: key, receipts: 0, issues: 0, adjustments: 0, movements: 0 };
    if (m.type === "IN") row.receipts += m.quantity;
    else if (m.type === "OUT") row.issues += m.quantity;
    else row.adjustments += m.type === "ADJUST_IN" ? m.quantity : -m.quantity;
    row.movements += 1;
    byDay.set(key, row);
  }
  const rows = [...byDay.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
  return {
    rows,
    totals: {
      receipts: rows.reduce((s, r) => s + r.receipts, 0),
      issues: rows.reduce((s, r) => s + r.issues, 0),
      adjustments: rows.reduce((s, r) => s + r.adjustments, 0),
    },
  };
}

/** Valuation summary grouped by category. */
export async function valuationSummary(actor) {
  await assertReportAccess(actor);
  const rows = await listInventory(actor, { includeArchived: true });
  const byCategory = new Map();
  for (const r of rows) {
    const row = byCategory.get(r.categoryName) ?? { category: r.categoryName, products: 0, units: 0, value: 0 };
    row.products += 1;
    row.units += r.onHand;
    row.value += r.value;
    byCategory.set(r.categoryName, row);
  }
  const list = [...byCategory.values()].sort((a, b) => b.value - a.value);
  return {
    rows: list,
    totals: {
      products: list.reduce((s, r) => s + r.products, 0),
      units: list.reduce((s, r) => s + r.units, 0),
      value: list.reduce((s, r) => s + r.value, 0),
    },
    valuationNote:
      "Valuation = current on-hand × latest recorded unit cost (falls back to the configured buying price).",
  };
}
