import { describe, expect, it } from "vitest";
import {
  computeOnHand,
  movementSign,
  multiplyMoney,
  reversalType,
  stockStatus,
  valuationBasis,
} from "@/lib/stock.js";

describe("stock rules", () => {
  it("BR-03: on-hand = IN + adj+ − OUT − adj−", () => {
    expect(
      computeOnHand([
        { type: "IN", quantity: 30 },
        { type: "IN", quantity: 20 },
        { type: "OUT", quantity: 12 },
      ]),
    ).toBe(38);
    expect(
      computeOnHand([
        { type: "IN", quantity: 10 },
        { type: "ADJUST_IN", quantity: 5 },
        { type: "ADJUST_OUT", quantity: 3 },
        { type: "OUT", quantity: 2 },
      ]),
    ).toBe(10);
  });

  it("BR-02: signs", () => {
    expect(movementSign("IN")).toBe(1);
    expect(movementSign("ADJUST_IN")).toBe(1);
    expect(movementSign("OUT")).toBe(-1);
    expect(movementSign("ADJUST_OUT")).toBe(-1);
    expect(() => movementSign("NOPE")).toThrow();
  });

  it("BR-05: status thresholds (spec example: 38 bags, reorder 40 => LOW)", () => {
    expect(stockStatus(38, 40)).toBe("LOW");
    expect(stockStatus(40, 40)).toBe("LOW"); // at reorder point
    expect(stockStatus(41, 40)).toBe("NORMAL");
    expect(stockStatus(0, 40)).toBe("OUT");
    expect(stockStatus(0, 0)).toBe("OUT");
    expect(stockStatus(1, 0)).toBe("NORMAL");
  });

  it("reversal types cancel the original", () => {
    for (const type of ["IN", "OUT", "ADJUST_IN", "ADJUST_OUT"]) {
      expect(movementSign(reversalType(type))).toBe(-movementSign(type));
    }
  });

  it("valuation basis prefers latest cost, then configured price", () => {
    expect(valuationBasis({ latestUnitCost: "12.50", buyingPrice: "10" }).basis).toBe("LATEST_COST");
    expect(valuationBasis({ latestUnitCost: null, buyingPrice: "10" }).basis).toBe("CONFIGURED_PRICE");
    expect(valuationBasis({ latestUnitCost: null, buyingPrice: null }).basis).toBe("NONE");
  });

  it("money multiplication avoids float drift", () => {
    expect(multiplyMoney("0.10", 3)).toBe(0.3);
    expect(multiplyMoney("19.99", 3)).toBe(59.97);
    expect(multiplyMoney(null, 5)).toBe(0);
  });
});
