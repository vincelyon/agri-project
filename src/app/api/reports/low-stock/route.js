import { route } from "@/lib/api.js";
import { csvResponse } from "@/lib/csv.js";
import { lowStockReport } from "@/services/reports.js";

export const GET = route(async ({ actor, query }) => {
  const report = await lowStockReport(actor);
  if (query.get("format") !== "csv") return report;
  return csvResponse(
    "low-stock.csv",
    ["SKU", "Product", "Category", "Unit", "On hand", "Reorder level", "Status"],
    report.rows.map((r) => [r.sku, r.name, r.categoryName, r.unit, r.onHand, r.reorderLevel, r.status]),
  );
});
