/* Protected setup/seed process (spec §3): creates the first administrator and,
 * optionally, demo data. Safe to re-run; it never overwrites existing users. */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function seedAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "";
  const name = process.env.SEED_ADMIN_NAME || "Administrator";
  if (!email || password.length < 8) {
    throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (min 8 chars) before seeding.");
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} already exists - leaving it unchanged.`);
    return existing;
  }
  const admin = await prisma.user.create({
    data: {
      name,
      email,
      role: "ADMIN",
      passwordHash: await bcrypt.hash(password, 12),
      mustChangePassword: true, // must be changed at first use
    },
  });
  await prisma.auditLog.create({
    data: { actorId: admin.id, action: "USER_CREATED", entityType: "User", entityId: String(admin.id), afterJson: { email, role: "ADMIN", via: "seed" } },
  });
  console.log(`Created administrator ${email} (password must be changed at first sign-in).`);
  return admin;
}

async function seedDemo(admin) {
  if ((await prisma.product.count()) > 0) {
    console.log("Products already exist - skipping demo data.");
    return;
  }
  const categories = {};
  for (const [name, description] of [
    ["Fertilizer", "Basal and top-dressing fertilizers"],
    ["Seed", "Certified maize, legume and vegetable seed"],
    ["Pesticide", "Insecticides, herbicides and fungicides"],
    ["Farm Tool", "Hand tools and implements"],
  ]) {
    categories[name] = await prisma.category.create({ data: { name, description } });
  }
  const suppliers = [];
  for (const s of [
    { name: "Zambia Agri Supplies", phone: "+260 211 000 111", email: "sales@zas.example", address: "Lusaka" },
    { name: "Green Valley Seeds", phone: "+260 212 000 222", email: "orders@gvs.example", address: "Kitwe" },
  ]) {
    suppliers.push(await prisma.supplier.create({ data: s }));
  }

  const products = [
    ["UREA-50", "Urea 50kg", "Fertilizer", "bag", 40, 30, 20, 410, 480],
    ["DCOMP-50", "D-Compound 50kg", "Fertilizer", "bag", 40, 60, 0, 430, 500],
    ["MZ-SEED-10", "Hybrid Maize Seed 10kg", "Seed", "bag", 25, 80, 5, 260, 320],
    ["SOY-SEED-25", "Soya Bean Seed 25kg", "Seed", "bag", 15, 0, 0, 380, 440],
    ["PEST-CYP-1L", "Cypermethrin 1L", "Pesticide", "litre", 10, 18, 3, 120, 150],
    ["HOE-STD", "Hand Hoe", "Farm Tool", "piece", 20, 55, 4, 45, 65],
  ];

  for (const [sku, name, cat, unit, reorderLevel, opening, issued, buy, sell] of products) {
    const product = await prisma.product.create({
      data: {
        sku, name, unit, reorderLevel,
        categoryId: categories[cat].id,
        buyingPrice: buy, sellingPrice: sell,
        balance: { create: { quantityOnHand: opening - issued } },
      },
    });
    if (opening > 0) {
      await prisma.stockMovement.create({
        data: { productId: product.id, type: "IN", quantity: opening, unitCost: buy, supplierId: suppliers[0].id, reference: "OPENING", notes: "Opening stock", performedById: admin.id, occurredAt: new Date(Date.now() - 14 * 86400000) },
      });
    }
    if (issued > 0) {
      await prisma.stockMovement.create({
        data: { productId: product.id, type: "OUT", quantity: issued, issueType: "SALE", recipient: "Walk-in customer", reference: "DEMO-SALE", performedById: admin.id, occurredAt: new Date(Date.now() - 3 * 86400000) },
      });
    }
  }
  console.log("Loaded demo categories, suppliers, products and movements.");
}

async function main() {
  const admin = await seedAdmin();
  if (process.env.SEED_DEMO_DATA === "true") await seedDemo(admin);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
