/**
 * HTTP-level smoke test against a RUNNING app (npm run dev / npm start) with demo data seeded.
 * Verifies server-side authentication, role enforcement, CSRF and CSV export.
 *
 *   npm run db:seed && npm run dev      # terminal 1
 *   npm run test:e2e                    # terminal 2
 *
 * It signs session cookies directly with SESSION_SECRET, so it needs the same .env as the server.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const prisma = new PrismaClient();
const key = new TextEncoder().encode(process.env.SESSION_SECRET);
const token = (id) =>
  new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(String(id)).setIssuedAt().setExpirationTime("10m").sign(key);

let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
  if (!ok) failures++;
}

async function call(path, { method = "GET", cookie, body, origin = BASE } = {}) {
  const headers = {};
  if (cookie) headers.Cookie = `agri_session=${cookie}`;
  if (body) headers["Content-Type"] = "application/json";
  if (origin && method !== "GET") headers.Origin = origin;
  const res = await fetch(BASE + path, { method, headers, body: body && JSON.stringify(body), redirect: "manual" });
  return { status: res.status, text: await res.text(), location: res.headers.get("location"), type: res.headers.get("content-type") };
}

try {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN", isActive: true } });
  let staff = await prisma.user.findUnique({ where: { email: "e2e-attendant@agri.local" } });
  staff ??= await prisma.user.create({
    data: { name: "E2E Attendant", email: "e2e-attendant@agri.local", role: "STAFF", passwordHash: await bcrypt.hash("E2e-Attendant1!", 10) },
  });
  const A = await token(admin.id);
  const S = await token(staff.id);
  const product = JSON.parse((await call("/api/products", { cookie: A })).text).rows[0];
  if (!product) throw new Error("No products found - run `npm run db:seed` with SEED_DEMO_DATA=true first.");

  check("anonymous API call is rejected (401)", (await call("/api/inventory")).status === 401);
  check("anonymous page redirects to /login", (await call("/dashboard")).location?.endsWith("/login"));
  check("forged session cookie is rejected", (await call("/api/inventory", { cookie: "abc.def.ghi" })).status === 401);

  check("T10 staff: GET /api/users -> 403", (await call("/api/users", { cookie: S })).status === 403);
  check("T10 staff: POST adjustment -> 403", (await call("/api/stock/adjustments", { method: "POST", cookie: S, body: { productId: product.id, direction: "IN", quantity: 1, reason: "x" } })).status === 403);
  check("staff: catalog write -> 403", (await call("/api/categories", { method: "POST", cookie: S, body: { name: "Nope" } })).status === 403);
  check("staff: reports -> 403 (setting off)", (await call("/api/reports/stock", { cookie: S })).status === 403);
  check("staff: /users page -> /forbidden", (await call("/users", { cookie: S })).location?.endsWith("/forbidden"));
  check("staff: GET inventory allowed", (await call("/api/inventory", { cookie: S })).status === 200);

  check("CSRF: cross-origin POST blocked", (await call("/api/stock/receipts", { method: "POST", cookie: A, origin: "http://evil.example", body: { productId: product.id, quantity: 1 } })).status === 403);
  check("CSRF: POST without Origin blocked", (await call("/api/stock/receipts", { method: "POST", cookie: A, origin: null, body: { productId: product.id, quantity: 1 } })).status === 403);

  const bad = await call("/api/stock/issues", { method: "POST", cookie: S, body: { productId: product.id, quantity: -3, issueType: "SALE" } });
  check("negative quantity -> 422 with field error", bad.status === 422 && JSON.parse(bad.text).fieldErrors?.quantity);
  const over = await call("/api/stock/issues", { method: "POST", cookie: S, body: { productId: product.id, quantity: 999999, issueType: "SALE" } });
  check("over-available issue -> 409", over.status === 409, over.text);

  const csv = await call("/api/reports/stock?format=csv", { cookie: A });
  check("admin CSV export", csv.status === 200 && csv.type?.startsWith("text/csv") && csv.text.includes("SKU,Product"));
} finally {
  await prisma.$disconnect();
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll e2e checks passed");
process.exit(failures ? 1 : 0);
