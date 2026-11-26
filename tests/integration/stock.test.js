import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { makeProduct, makeUser, onHand, prisma, resetDb } from "./helpers.js";
import { adjustStock, issueStock, receiveStock, reverseMovement, listInventory, getDashboard } from "@/services/inventory.js";
import { computeOnHand } from "@/lib/stock.js";
import { toDateInput } from "@/lib/format.js";

let admin;
let staff;

beforeEach(async () => {
  await resetDb();
  admin = await makeUser({ role: "ADMIN" });
  staff = await makeUser({ role: "STAFF" });
});

afterAll(async () => {
  await prisma.$disconnect();
});

const issue = (actor, productId, quantity, extra = {}) =>
  issueStock(actor, { productId: String(productId), quantity: String(quantity), issueType: "SALE", ...extra });
const receive = (actor, productId, quantity, extra = {}) =>
  receiveStock(actor, { productId: String(productId), quantity: String(quantity), ...extra });

describe("inventory engine", () => {
  it("T04: receipt of 20 on 10 on-hand => 30 and a stored movement", async () => {
    const p = await makeProduct(admin, { openingQuantity: "10" });
    const res = await receive(staff, p.id, 20, { unitCost: "55.50", reference: "GRN-1" });
    expect(res.balanceAfter).toBe(30);
    expect(await onHand(p.id)).toBe(30);
    const m = await prisma.stockMovement.findUnique({ where: { id: res.id } });
    expect(m).toMatchObject({ type: "IN", quantity: 20, performedById: staff.id, reference: "GRN-1" });
    expect(m.unitCost.toString()).toBe("55.5");
  });

  it("T05/T06: issue 12 of 30 => 18; issuing 19 more is rejected and balance stays 18", async () => {
    const p = await makeProduct(admin, { openingQuantity: "30" });
    expect((await issue(staff, p.id, 12)).balanceAfter).toBe(18);
    await expect(issue(staff, p.id, 19)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await onHand(p.id)).toBe(18);
    expect(await prisma.stockMovement.count({ where: { productId: p.id, type: "OUT" } })).toBe(1);
  });

  it("rejects non-positive quantities", async () => {
    const p = await makeProduct(admin, { openingQuantity: "5" });
    await expect(issue(staff, p.id, 0)).rejects.toMatchObject({ code: "INVALID" });
    await expect(issue(staff, p.id, -2)).rejects.toMatchObject({ code: "INVALID" });
    await expect(receive(staff, p.id, 0)).rejects.toMatchObject({ code: "INVALID" });
    expect(await onHand(p.id)).toBe(5);
  });

  it("spec example: 30 + 20 − 12 = 38, reorder 40 => LOW; reaching 0 => OUT (T07/T08)", async () => {
    const p = await makeProduct(admin, { openingQuantity: "30" });
    await receive(staff, p.id, 20);
    await issue(staff, p.id, 12);
    let [row] = await listInventory(staff);
    expect(row).toMatchObject({ onHand: 38, status: "LOW" });
    await issue(staff, p.id, 38);
    [row] = await listInventory(staff);
    expect(row).toMatchObject({ onHand: 0, status: "OUT" });
  });

  it("T09: concurrent issues never overdraw", async () => {
    const p = await makeProduct(admin, { openingQuantity: "30" });
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => issue(staff, p.id, 10)),
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected");
    expect(ok).toBe(3);
    expect(failed).toHaveLength(5);
    failed.forEach((f) => expect(f.reason.code).toBe("CONFLICT"));
    expect(await onHand(p.id)).toBe(0);
  });

  it("T12: a failing write rolls back both movement and balance", async () => {
    const p = await makeProduct(admin, { openingQuantity: "10" });
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION test_fail_audit() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'simulated write failure'; END; $$ LANGUAGE plpgsql;`);
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER test_fail BEFORE INSERT ON audit_logs FOR EACH ROW WHEN (NEW.action = 'STOCK_IN') EXECUTE FUNCTION test_fail_audit()`,
    );
    try {
      await expect(receive(staff, p.id, 5)).rejects.toBeTruthy();
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER test_fail ON audit_logs`);
    }
    expect(await onHand(p.id)).toBe(10);
    expect(await prisma.stockMovement.count({ where: { productId: p.id } })).toBe(1); // opening only
  });

  it("ledger always reconciles with the materialised balance (BR-03)", async () => {
    const p = await makeProduct(admin, { openingQuantity: "100" });
    await receive(staff, p.id, 25);
    await issue(staff, p.id, 40);
    await adjustStock(admin, { productId: String(p.id), direction: "OUT", quantity: "5", reason: "Damaged bags" });
    await adjustStock(admin, { productId: String(p.id), direction: "IN", quantity: "2", reason: "Recount" });
    const movements = await prisma.stockMovement.findMany({ where: { productId: p.id } });
    expect(computeOnHand(movements)).toBe(await onHand(p.id));
    expect(await onHand(p.id)).toBe(82);
  });

  it("rejects future dates and archived products", async () => {
    const p = await makeProduct(admin, { openingQuantity: "5" });
    const tomorrow = toDateInput(new Date(Date.now() + 2 * 86400000));
    await expect(receive(staff, p.id, 1, { occurredAt: tomorrow })).rejects.toMatchObject({ code: "INVALID" });
    const { setProductActive } = await import("@/services/products.js");
    await setProductActive(admin, p.id, false);
    await expect(receive(staff, p.id, 1)).rejects.toMatchObject({ code: "INVALID" });
  });

  it("rejects archived suppliers on receipts", async () => {
    const p = await makeProduct(admin);
    const s = await prisma.supplier.create({ data: { name: "Old Supplier", isActive: false } });
    await expect(receive(staff, p.id, 1, { supplierId: String(s.id) })).rejects.toMatchObject({ code: "INVALID" });
  });
});

describe("adjustments and reversals", () => {
  it("T10: staff cannot adjust or reverse (backend denies)", async () => {
    const p = await makeProduct(admin, { openingQuantity: "10" });
    await expect(
      adjustStock(staff, { productId: String(p.id), direction: "IN", quantity: "1", reason: "x" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const m = await prisma.stockMovement.findFirst({ where: { productId: p.id } });
    await expect(reverseMovement(staff, m.id, { reason: "oops" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await onHand(p.id)).toBe(10);
  });

  it("adjustment records author and reason and cannot go negative", async () => {
    const p = await makeProduct(admin, { openingQuantity: "3" });
    await adjustStock(admin, { productId: String(p.id), direction: "OUT", quantity: "2", reason: "Expired" });
    const m = await prisma.stockMovement.findFirst({ where: { productId: p.id, type: "ADJUST_OUT" } });
    expect(m).toMatchObject({ reason: "Expired", performedById: admin.id });
    await expect(
      adjustStock(admin, { productId: String(p.id), direction: "OUT", quantity: "5", reason: "Lost" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await onHand(p.id)).toBe(1);
  });

  it("BR-07: reversal posts a compensating entry, once only; original is untouched", async () => {
    const p = await makeProduct(admin, { openingQuantity: "30" });
    const { id } = await issue(staff, p.id, 12);
    expect(await onHand(p.id)).toBe(18);
    const rev = await reverseMovement(admin, id, { reason: "Wrong product" });
    expect(rev.balanceAfter).toBe(30);
    await expect(reverseMovement(admin, id, { reason: "again" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(reverseMovement(admin, rev.id, { reason: "undo undo" })).rejects.toMatchObject({ code: "CONFLICT" });
    const original = await prisma.stockMovement.findUnique({ where: { id } });
    expect(original).toMatchObject({ type: "OUT", quantity: 12 });
    expect(await onHand(p.id)).toBe(30);
  });

  it("DB blocks silent edits/deletes of ledger and audit rows", async () => {
    const p = await makeProduct(admin, { openingQuantity: "5" });
    const m = await prisma.stockMovement.findFirst({ where: { productId: p.id } });
    await expect(prisma.stockMovement.update({ where: { id: m.id }, data: { quantity: 999 } })).rejects.toBeTruthy();
    await expect(prisma.stockMovement.delete({ where: { id: m.id } })).rejects.toBeTruthy();
    await expect(prisma.auditLog.deleteMany({})).rejects.toBeTruthy();
  });

  it("DB CHECK prevents a negative balance even if the service were bypassed", async () => {
    const p = await makeProduct(admin, { openingQuantity: "5" });
    await expect(
      prisma.stockBalance.update({ where: { productId: p.id }, data: { quantityOnHand: -1 } }),
    ).rejects.toBeTruthy();
  });
});

describe("dashboard and valuation", () => {
  it("figures match the ledger; valuation uses latest unit cost (BR-08)", async () => {
    const a = await makeProduct(admin, { openingQuantity: "10", reorderLevel: "20", buyingPrice: "100" });
    const b = await makeProduct(admin, { openingQuantity: "50", reorderLevel: "10" });
    const c = await makeProduct(admin, { reorderLevel: "5" }); // 0 on hand => OUT
    await receive(staff, b.id, 10, { unitCost: "7.50" });
    const d = await getDashboard(staff);
    expect(d.activeProducts).toBe(3);
    expect(d.totalUnits).toBe(70);
    expect(d.lowStock).toBe(1);
    expect(d.outOfStock).toBe(1);
    // a: 10 × 100 (configured; opening IN recorded cost 100) + b: 60 × 7.50 = 1000 + 450
    expect(d.stockValue).toBe(1450);
    expect(d.recentMovements.length).toBeGreaterThan(0);
    expect(c.id).toBeTruthy();
    expect(a.id).toBeTruthy();
  });
});
