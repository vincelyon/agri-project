import { route } from "@/lib/api.js";
import { csvResponse } from "@/lib/csv.js";
import { COST_BASIS_LABELS, stockOnHandReport } from "@/services/reports.js";

export const GET = route(async ({ actor, query }) => {
  const report = await stockOnHandReport(actor);
  if (query.get("format") !== "csv") return report;
  return csvResponse(
    "stock-on-hand.csv",
    ["SKU", "Product", "Category", "Unit", "Archived", "On hand", "Reorder level", "Status", "Unit cost", "Cost basis", "Value"],
    [
      ...report.rows.map((r) => [r.sku, r.name, r.categoryName, r.unit, r.isActive ? "No" : "Yes", r.onHand, r.reorderLevel, r.status, r.unitCost ?? "", COST_BASIS_LABELS[r.costBasis], r.value.toFixed(2)]),
      ["TOTAL", "", "", "", "", report.totals.units, "", "", "", report.valuationNote, report.totals.value.toFixed(2)],
    ],
  );
});
