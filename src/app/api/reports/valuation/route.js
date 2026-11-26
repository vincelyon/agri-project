import { route } from "@/lib/api.js";
import { csvResponse } from "@/lib/csv.js";
import { valuationSummary } from "@/services/reports.js";

export const GET = route(async ({ actor, query }) => {
  const report = await valuationSummary(actor);
  if (query.get("format") !== "csv") return report;
  return csvResponse(
    "valuation-summary.csv",
    ["Category", "Products", "Units", "Value"],
    [
      ...report.rows.map((r) => [r.category, r.products, r.units, r.value.toFixed(2)]),
      ["TOTAL", report.totals.products, report.totals.units, report.totals.value.toFixed(2)],
      [report.valuationNote, "", "", ""],
    ],
  );
});
