import { route } from "@/lib/api.js";
import { csvResponse } from "@/lib/csv.js";
import { str } from "@/lib/query.js";
import { dailyActivityReport } from "@/services/reports.js";

export const GET = route(async ({ actor, query }) => {
  const report = await dailyActivityReport(actor, {
    from: str(query.get("from")),
    to: str(query.get("to")),
    productId: str(query.get("product")),
    type: str(query.get("type")),
  });
  if (query.get("format") !== "csv") return report;
  return csvResponse(
    "receipts-issues-by-date.csv",
    ["Date", "Received", "Issued", "Net adjustments", "Movements"],
    [
      ...report.rows.map((r) => [r.date, r.receipts, r.issues, r.adjustments, r.movements]),
      ["TOTAL", report.totals.receipts, report.totals.issues, report.totals.adjustments, ""],
    ],
  );
});
