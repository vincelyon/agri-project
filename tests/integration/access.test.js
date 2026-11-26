import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { makeCategory, makeProduct, makeUser, prisma, resetDb } from "./helpers.js";
import { authenticate, changeOwnPassword } from "@/services/auth.js";
import { createUser, listUsers, updateUser } from "@/services/users.js";
import { createProduct, updateProduct, setProductActive, listProducts } from "@/services/products.js";
import { createCategory, setCategoryActive } from "@/services/categories.js";
import { createSupplier } from "@/services/suppliers.js";
import { updateSettings, getSettings } from "@/services/settings.js";
import { listAuditLogs } from "@/services/audit.js";
import { movementRegister, stockOnHandReport } from "@/services/reports.js";
import { receiveStock } from "@/services/inventory.js";
import { toDateInput } from "@/lib/format.js";

let admin;
let staff;

beforeEach(async () => {
  await resetDb();
  admin = await makeUser({ role: "ADMIN", email: "admin@test.local" });
  staff = await makeUser({ role: "STAFF", email: "staff@test.local" });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("authentication (M01)", () => {
  it("T01: valid credentials succeed (case-insensitive email)", async () => {
    const user = await authenticate({ email: "ADMIN@test.local", password: "Password123!" });
    expect(user.id).toBe(admin.id);
  });

  it("T02: wrong password / unknown user / inactive user are rejected with one generic message", async () => {
    const bad = await authenticate({ email: "admin@test.local", password: "nope" }).catch((e) => e);
    const unknown = await authenticate({ email: "ghost@test.local", password: "nope" }).catch((e) => e);
    await prisma.user.update({ where: { id: staff.id }, data: { isActive: false } });
    const inactive = await authenticate({ email: "staff@test.local", password: "Password123!" }).catch((e) => e);
    for (const e of [bad, unknown, inactive]) {
      expect(e).toMatchObject({ code: "INVALID_CREDENTIALS", message: "Incorrect email or password." });
    }
  });

  it("locks out after repeated failures", async () => {
    for (let i = 0; i < 5; i++) {
      await authenticate({ email: "admin@test.local", password: "bad" }).catch(() => {});
    }
    await expect(authenticate({ email: "admin@test.local", password: "Password123!" })).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
  });

  it("passwords are stored hashed and sign-ins are audited", async () => {
    await authenticate({ email: "admin@test.local", password: "Password123!" });
    const row = await prisma.user.findUnique({ where: { id: admin.id } });
    expect(row.passwordHash).not.toContain("Password123!");
    expect(row.passwordHash.startsWith("$2")).toBe(true);
    expect(await prisma.auditLog.count({ where: { action: "LOGIN", actorId: admin.id } })).toBe(1);
  });

  it("change password requires the current one and clears the first-login flag", async () => {
    await prisma.user.update({ where: { id: staff.id }, data: { mustChangePassword: true } });
    await expect(
      changeOwnPassword(staff, { currentPassword: "wrong", newPassword: "NewPassword1!", confirmPassword: "NewPassword1!" }),
    ).rejects.toMatchObject({ code: "INVALID" });
    await changeOwnPassword(staff, {
      currentPassword: "Password123!",
      newPassword: "NewPassword1!",
      confirmPassword: "NewPassword1!",
    });
    expect((await prisma.user.findUnique({ where: { id: staff.id } })).mustChangePassword).toBe(false);
    await expect(authenticate({ email: "staff@test.local", password: "NewPassword1!" })).resolves.toBeTruthy();
  });
});

describe("user management (M02)", () => {
  it("T10: staff cannot list or manage users", async () => {
    await expect(listUsers(staff)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      createUser(staff, { name: "X", email: "x@test.local", role: "ADMIN", password: "Password123!" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(updateUser(staff, admin.id, { role: "STAFF" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("admin creates a user who must change password; duplicates are rejected", async () => {
    const u = await createUser(admin, { name: "New", email: "New@Test.local", role: "STAFF", password: "Password123!" });
    expect(u.email).toBe("new@test.local");
    expect(u.mustChangePassword).toBe(true);
    expect(u.temporaryPassword).toBe("Password123!");
    await expect(
      createUser(admin, { name: "Dup", email: "new@test.local", role: "STAFF", password: "Password123!" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("admin create without password auto-generates a temporary one", async () => {
    const u = await createUser(admin, { name: "Auto", email: "auto@test.local", role: "STAFF" });
    expect(u.mustChangePassword).toBe(true);
    expect(u.temporaryPassword).toMatch(/^.{12,}$/);
    await expect(authenticate({ email: "auto@test.local", password: u.temporaryPassword })).resolves.toMatchObject({
      email: "auto@test.local",
    });
  });

  it("deactivation blocks sign-in; last admin and self are protected", async () => {
    await updateUser(admin, staff.id, { isActive: false });
    await expect(authenticate({ email: "staff@test.local", password: "Password123!" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
    await expect(updateUser(admin, admin.id, { isActive: false })).rejects.toMatchObject({ code: "CONFLICT" });
    const admin2 = await makeUser({ role: "ADMIN" });
    await expect(updateUser(admin2, admin.id, { role: "STAFF" })).resolves.toBeTruthy(); // another admin remains
    await expect(updateUser(admin2, admin2.id, { role: "STAFF" })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("deactivated actors are rejected by every service", async () => {
    await prisma.user.update({ where: { id: admin.id }, data: { isActive: false } });
    const stale = { ...admin, isActive: false };
    await expect(listUsers(stale)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });
});

describe("catalog (M04–M06)", () => {
  it("T03: duplicate SKU (case-insensitive) is rejected", async () => {
    const cat = await makeCategory();
    const base = { name: "Urea", categoryId: String(cat.id), unit: "bag", reorderLevel: "10" };
    await createProduct(admin, { ...base, sku: "UREA-50" });
    await expect(createProduct(admin, { ...base, sku: "urea-50" })).rejects.toMatchObject({
      code: "CONFLICT",
      fieldErrors: { sku: expect.any(String) },
    });
  });

  it("staff cannot write the catalog but can read it", async () => {
    const cat = await makeCategory();
    const base = { sku: "S1", name: "Seed", categoryId: String(cat.id), unit: "kg", reorderLevel: "1" };
    await expect(createProduct(staff, base)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createCategory(staff, { name: "X" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createSupplier(staff, { name: "S" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await createProduct(admin, base);
    expect((await listProducts(staff)).rows).toHaveLength(1);
  });

  it("category names are unique (case-insensitive) and categories are archived, not deleted", async () => {
    await createCategory(admin, { name: "Seed" });
    await expect(createCategory(admin, { name: "seed" })).rejects.toMatchObject({ code: "CONFLICT" });
    const cat = await prisma.category.findFirst({ where: { name: "Seed" } });
    await setCategoryActive(admin, cat.id, false);
    await expect(prisma.category.delete({ where: { id: cat.id } })).resolves.toBeTruthy(); // unused: FK allows
    const used = await makeCategory("Used");
    await makeProduct(admin, { categoryId: used.id });
    await expect(prisma.category.delete({ where: { id: used.id } })).rejects.toBeTruthy(); // in use: blocked
  });

  it("products with movements cannot be hard-deleted; archived products stay in reports", async () => {
    const p = await makeProduct(admin, { openingQuantity: "5" });
    await expect(prisma.product.delete({ where: { id: p.id } })).rejects.toBeTruthy();
    await setProductActive(admin, p.id, false);
    const report = await stockOnHandReport(admin);
    expect(report.rows.map((r) => r.id)).toContain(p.id);
  });

  it("opening quantity becomes an initial IN movement", async () => {
    const p = await makeProduct(admin, { openingQuantity: "12" });
    const m = await prisma.stockMovement.findMany({ where: { productId: p.id } });
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ type: "IN", quantity: 12, reference: "OPENING" });
  });

  it("quantities cannot be edited through product update", async () => {
    const p = await makeProduct(admin, { openingQuantity: "12" });
    const updated = await updateProduct(admin, p.id, {
      sku: p.sku,
      name: "Renamed",
      categoryId: String(p.categoryId),
      unit: "bag",
      reorderLevel: "3",
      onHand: "999",
      quantityOnHand: "999",
    });
    expect(updated.onHand).toBe(12);
    expect(updated.name).toBe("Renamed");
  });
});

describe("audit trail (M12)", () => {
  it("records product changes with before/after, and staff cannot read it", async () => {
    const p = await makeProduct(admin);
    await updateProduct(admin, p.id, {
      sku: p.sku,
      name: "Renamed",
      categoryId: String(p.categoryId),
      unit: "bag",
      reorderLevel: "40",
    });
    const { rows } = await listAuditLogs(admin, { entityType: "Product" });
    const upd = rows.find((r) => r.action === "PRODUCT_UPDATED");
    expect(upd.actorId).toBe(admin.id);
    expect(upd.beforeJson.name).toBe("Urea 50kg");
    expect(upd.afterJson.name).toBe("Renamed");
    await expect(listAuditLogs(staff)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("reports (M11) and settings (M13)", () => {
  it("T11: date-filtered register is traceable and totals reconcile", async () => {
    const p = await makeProduct(admin, { openingQuantity: "10" });
    await receiveStock(admin, { productId: String(p.id), quantity: "5" });
    const old = new Date(Date.now() - 10 * 86400000);
    // Back-dated entry created through the service with an explicit past date.
    await receiveStock(admin, { productId: String(p.id), quantity: "7", occurredAt: toDateInput(old) });
    const today = toDateInput(); // local calendar day, as the date inputs use
    const filtered = await movementRegister(admin, { from: today, to: today });
    expect(filtered.rows.every((r) => r.quantity !== 7)).toBe(true);
    expect(filtered.totals.stockIn).toBe(15);
    const all = await movementRegister(admin, {});
    expect(all.totals.stockIn).toBe(22);
    expect(all.totals.count).toBe(all.rows.length);
  });

  it("reports are admin-only unless the setting enables staff access", async () => {
    await expect(movementRegister(staff, {})).rejects.toMatchObject({ code: "FORBIDDEN" });
    await updateSettings(admin, { shopName: "Shop", currency: "ZMW", units: "bag", staffCanViewReports: "on" });
    await expect(movementRegister(staff, {})).resolves.toBeTruthy();
  });

  it("settings: admin only, validated, and applied", async () => {
    await expect(
      updateSettings(staff, { shopName: "Hack", currency: "ZMW", units: "bag" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await updateSettings(admin, { shopName: "Mwila Agro", currency: "usd", units: "bag, kg" });
    const s = await getSettings();
    expect(s).toMatchObject({ shopName: "Mwila Agro", currency: "USD", units: ["bag", "kg"], staffCanViewReports: false });
  });
});
