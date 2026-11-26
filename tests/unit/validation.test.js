import { describe, expect, it } from "vitest";
import {
  adjustmentSchema,
  issueSchema,
  parseInput,
  productCreateSchema,
  receiptSchema,
  settingsSchema,
} from "@/lib/validation.js";
import { ServiceError } from "@/lib/errors.js";
import { toCsv } from "@/lib/csv.js";
import { can, PERMISSIONS } from "@/lib/permissions.js";

describe("validation", () => {
  it("rejects non-positive and fractional quantities (BR-01)", () => {
    const base = { productId: "1", issueType: "SALE" };
    for (const quantity of ["0", "-3", "1.5", "abc", ""]) {
      expect(() => parseInput(issueSchema, { ...base, quantity })).toThrow(ServiceError);
    }
    expect(parseInput(issueSchema, { ...base, quantity: "7" }).quantity).toBe(7);
  });

  it("treats blank optional fields as absent", () => {
    const data = parseInput(receiptSchema, {
      productId: "2",
      quantity: "5",
      supplierId: "",
      unitCost: "",
      reference: "  ",
      occurredAt: "",
    });
    expect(data.supplierId).toBeUndefined();
    expect(data.unitCost).toBeUndefined();
    expect(data.reference).toBeUndefined();
  });

  it("accepts up to 2 decimals for money and rejects more / negatives", () => {
    const ok = (unitCost) => parseInput(receiptSchema, { productId: "1", quantity: "1", unitCost });
    expect(ok("12.5").unitCost).toBe(12.5);
    expect(ok("0.1").unitCost).toBe(0.1);
    expect(() => ok("1.234")).toThrow(ServiceError);
    expect(() => ok("-1")).toThrow(ServiceError);
  });

  it("normalises SKU and requires non-negative reorder level", () => {
    const base = { name: "Urea", categoryId: "1", unit: "bag" };
    const data = parseInput(productCreateSchema, { ...base, sku: " ur-50 ", reorderLevel: "40" });
    expect(data.sku).toBe("UR-50");
    expect(() => parseInput(productCreateSchema, { ...base, sku: "A", reorderLevel: "-1" })).toThrow();
    expect(() =>
      parseInput(productCreateSchema, { ...base, sku: "A", reorderLevel: "1", openingQuantity: "-5" }),
    ).toThrow();
  });

  it("adjustments need a reason", () => {
    const base = { productId: "1", direction: "OUT", quantity: "2" };
    expect(() => parseInput(adjustmentSchema, { ...base, reason: " " })).toThrow(ServiceError);
    expect(parseInput(adjustmentSchema, { ...base, reason: "Damaged" }).reason).toBe("Damaged");
  });

  it("returns field-level errors", () => {
    try {
      parseInput(receiptSchema, { productId: "", quantity: "0" });
      throw new Error("should not reach");
    } catch (e) {
      expect(e).toBeInstanceOf(ServiceError);
      expect(Object.keys(e.fieldErrors)).toEqual(expect.arrayContaining(["productId", "quantity"]));
    }
  });

  it("parses settings (units list, checkbox, currency)", () => {
    const s = parseInput(settingsSchema, {
      shopName: "Mwila Agro",
      currency: "zmw",
      units: "bag, kg\nlitre",
      staffCanViewReports: "on",
    });
    expect(s).toEqual({ shopName: "Mwila Agro", currency: "ZMW", units: ["bag", "kg", "litre"], staffCanViewReports: true });
    expect(parseInput(settingsSchema, { shopName: "x", currency: "USD", units: "bag" }).staffCanViewReports).toBe(false);
    expect(() => parseInput(settingsSchema, { shopName: "x", currency: "KWACHA", units: "bag" })).toThrow();
  });
});

describe("csv", () => {
  it("quotes cells and neutralises formula injection", () => {
    const csv = toCsv(["a", "b"], [['he said "hi"', "=SUM(A1)"], ["1,2", -5]]);
    expect(csv).toContain('"he said ""hi"""');
    expect(csv).toContain("'=SUM(A1)");
    expect(csv).toContain('"1,2"');
    expect(csv).toContain(",-5"); // plain negative numbers stay numeric
  });
});

describe("permissions", () => {
  const admin = { role: "ADMIN", isActive: true };
  const staff = { role: "STAFF", isActive: true };
  it("matches the role matrix", () => {
    expect(can(admin, "users:manage")).toBe(true);
    expect(can(staff, "users:manage")).toBe(false);
    expect(can(staff, "stock:adjust")).toBe(false);
    expect(can(staff, "stock:receive")).toBe(true);
    expect(can(staff, "catalog:write")).toBe(false);
  });
  it("denies inactive or missing users for every permission", () => {
    for (const p of Object.keys(PERMISSIONS)) {
      expect(can({ ...admin, isActive: false }, p)).toBe(false);
      expect(can(null, p)).toBe(false);
    }
  });
});
