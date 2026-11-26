/**
 * Pure inventory rules (no I/O) so they can be unit tested in isolation.
 * Quantities are integers in the smallest stocking unit (BR-01).
 */

export const MOVEMENT_TYPES = ["IN", "OUT", "ADJUST_IN", "ADJUST_OUT"];

export const MOVEMENT_LABELS = {
  IN: "Stock in",
  OUT: "Stock out",
  ADJUST_IN: "Adjustment (+)",
  ADJUST_OUT: "Adjustment (−)",
};

/** +1 for movements that add stock, -1 for movements that remove it (BR-02). */
export function movementSign(type) {
  if (type === "IN" || type === "ADJUST_IN") return 1;
  if (type === "OUT" || type === "ADJUST_OUT") return -1;
  throw new Error(`Unknown movement type: ${type}`);
}

/** BR-03: on-hand = IN + positive adjustments − OUT − negative adjustments. */
export function computeOnHand(movements) {
  return movements.reduce((sum, m) => sum + movementSign(m.type) * m.quantity, 0);
}

/** BR-05: OUT when 0, LOW when 0 < onHand <= reorderLevel, otherwise NORMAL. */
export function stockStatus(onHand, reorderLevel) {
  if (onHand <= 0) return "OUT";
  if (onHand <= reorderLevel) return "LOW";
  return "NORMAL";
}

export const STATUS_LABELS = {
  OUT: "Out of stock",
  LOW: "Low stock",
  NORMAL: "Normal",
};

/** The movement type that exactly cancels the given one (BR-07 reversals). */
export function reversalType(type) {
  switch (type) {
    case "IN":
      return "ADJUST_OUT";
    case "ADJUST_IN":
      return "ADJUST_OUT";
    case "OUT":
      return "ADJUST_IN";
    case "ADJUST_OUT":
      return "ADJUST_IN";
    default:
      throw new Error(`Unknown movement type: ${type}`);
  }
}

/**
 * v1 valuation (BR-08): on-hand × latest recorded unit cost, falling back to the
 * product's configured buying price. Returns the cost basis so reports can label it.
 * Money is handled as strings/Decimal from the DB; here we use integer cents to
 * avoid float drift.
 */
export function valuationBasis({ latestUnitCost, buyingPrice }) {
  if (latestUnitCost != null) return { unitCost: latestUnitCost, basis: "LATEST_COST" };
  if (buyingPrice != null) return { unitCost: buyingPrice, basis: "CONFIGURED_PRICE" };
  return { unitCost: null, basis: "NONE" };
}

/** Multiply a decimal-like amount by an integer quantity using integer cents. */
export function multiplyMoney(amount, quantity) {
  if (amount == null) return 0;
  const cents = Math.round(Number(amount.toString()) * 100);
  return (cents * quantity) / 100;
}
