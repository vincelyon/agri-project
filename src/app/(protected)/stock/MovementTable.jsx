import { formatDateTime, formatMoney, formatNumber } from "@/lib/format.js";
import { MOVEMENT_LABELS } from "@/lib/stock.js";
import {
  DataTable,
  TableDatePill,
  TableNameCell,
  TableStatusPill,
  TableTd,
  TableTh,
} from "@/components/tables/DataTable.jsx";

const ISSUE_LABELS = { SALE: "Sale", DISTRIBUTION: "Distribution", INTERNAL_USE: "Internal use" };

/** Shared movement table using the Pest Risk data-table chrome. */
export function MovementTable({
  rows,
  currency,
  columns = ["date", "product", "type", "qty", "party", "ref", "by"],
  renderActions,
  toolbar,
}) {
  const has = (c) => columns.includes(c);

  return (
    <DataTable id="movements-table" minWidth="800px" toolbar={toolbar}>
      <caption className="sr-only">Stock movements</caption>
      <thead>
        <tr>
          {has("date") && <TableTh>Date</TableTh>}
          {has("product") && <TableTh>Product</TableTh>}
          {has("type") && <TableTh>Type</TableTh>}
          {has("qty") && <TableTh>Quantity</TableTh>}
          {has("party") && <TableTh shortLabel="Party">Supplier / recipient</TableTh>}
          {has("ref") && <TableTh shortLabel="Ref.">Reference / notes</TableTh>}
          {has("by") && <TableTh>By</TableTh>}
          {renderActions && <TableTh>Actions</TableTh>}
        </tr>
      </thead>
      <tbody>
        {rows.map((m, i) => {
          const add = m.type === "IN" || m.type === "ADJUST_IN";
          return (
            <tr key={m.id} className="group/row" style={{ animationDelay: `${Math.min(i * 40, 600)}ms` }}>
              {has("date") && (
                <TableTd>
                  <TableDatePill>{formatDateTime(m.occurredAt)}</TableDatePill>
                </TableTd>
              )}
              {has("product") && (
                <TableTd>
                  <TableNameCell name={m.productName} subtitle={m.sku} tone={add ? "success" : "info"} />
                </TableTd>
              )}
              {has("type") && (
                <TableTd>
                  <TableStatusPill label={MOVEMENT_LABELS[m.type] ?? m.type} tone={add ? "success" : "info"} />
                  {m.issueType && <p className="mt-1 text-xs text-stone-500">{ISSUE_LABELS[m.issueType]}</p>}
                  {m.reversalOfId && <p className="mt-1 text-xs text-stone-500">Reverses #{m.reversalOfId}</p>}
                  {m.isReversed && <p className="mt-1 text-xs font-medium text-amber-700">Reversed</p>}
                </TableTd>
              )}
              {has("qty") && (
                <TableTd>
                  <span className="text-sm font-semibold tabular-nums text-brand-900">
                    {formatNumber(m.quantity)} <span className="font-medium text-stone-500">{m.unit}</span>
                  </span>
                  {m.unitCost != null && (
                    <p className="text-xs text-stone-500">@ {formatMoney(m.unitCost, currency)}</p>
                  )}
                </TableTd>
              )}
              {has("party") && (
                <TableTd>
                  <span className="text-sm text-stone-600">{m.supplierName ?? m.recipient ?? "—"}</span>
                </TableTd>
              )}
              {has("ref") && (
                <TableTd>
                  {m.reference && <p className="text-sm text-stone-700">{m.reference}</p>}
                  {m.reason && <p className="text-xs text-stone-600">Reason: {m.reason}</p>}
                  {m.notes && <p className="text-xs text-stone-500">{m.notes}</p>}
                  {!m.reference && !m.reason && !m.notes && <span className="text-stone-400">—</span>}
                </TableTd>
              )}
              {has("by") && (
                <TableTd>
                  <span className="text-sm text-stone-600">{m.performedByName}</span>
                </TableTd>
              )}
              {renderActions && <TableTd>{renderActions(m)}</TableTd>}
            </tr>
          );
        })}
      </tbody>
    </DataTable>
  );
}
