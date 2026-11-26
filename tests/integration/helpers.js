import { prisma } from "@/lib/db.js";
import { hashPassword, resetLoginThrottle } from "@/services/auth.js";

export { prisma };

/** Wipe all data between tests. TRUNCATE bypasses the append-only row triggers. */
export async function resetDb() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE audit_logs, stock_movements, stock_balances, products, categories, suppliers, settings, users RESTART IDENTITY CASCADE`,
  );
  resetLoginThrottle();
}

export async function makeUser({ role = "STAFF", email, name, password = "Password123!", isActive = true } = {}) {
  return prisma.user.create({
    data: {
      name: name ?? `${role} user`,
      email: email ?? `${role.toLowerCase()}-${Math.random().toString(36).slice(2)}@test.local`,
      role,
      isActive,
      passwordHash: await hashPassword(password),
    },
  });
}

export async function makeCategory(name = "Fertilizer") {
  return prisma.category.create({ data: { name } });
}

export async function makeProduct(actor, overrides = {}) {
  const { createProduct } = await import("@/services/products.js");
  const category = overrides.categoryId ? null : await makeCategory(`Cat-${Math.random().toString(36).slice(2)}`);
  return createProduct(actor, {
    sku: `SKU-${Math.random().toString(36).slice(2, 8)}`,
    name: "Urea 50kg",
    categoryId: String(overrides.categoryId ?? category.id),
    unit: "bag",
    reorderLevel: "40",
    ...overrides,
  });
}

export async function onHand(productId) {
  const b = await prisma.stockBalance.findUnique({ where: { productId } });
  return b?.quantityOnHand;
}
