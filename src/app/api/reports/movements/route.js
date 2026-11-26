import { route } from "@/lib/api.js";
import { csvResponse } from "@/lib/csv.js";
import { str } from "@/lib/query.js";
import { movementRegister } from "@/services/reports.js";

export const GET = route(async ({ actor, query }) => {
  const report = await movementRegister(actor, {
    from: str(query.get("from")),
    to: str(query.get("to")),
    productId: str(query.get("product")),
    type: str(query.get("type")),
  });
  if (query.get("format") !== "csv") return report;
  return csvResponse(
    "stock-movements.csv",
    ["ID", "Date", "SKU", "Product", "Type", "Quantity", "Unit cost", "Supplier", "Issue type", "Recipient", "Reference", "Reason", "Notes", "Reverses", "Performed by"],
    report.rows.map((m) => [m.id, m.occurredAt, m.sku, m.productName, m.type, m.quantity, m.unitCost ?? "", m.supplierName ?? "", m.issueType ?? "", m.recipient ?? "", m.reference ?? "", m.reason ?? "", m.notes ?? "", m.reversalOfId ?? "", m.performedByName]),
  );
});
