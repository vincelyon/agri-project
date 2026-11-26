import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth.js";
import { formatDate, formatMoney, formatNumber } from "@/lib/format.js";
import { str } from "@/lib/query.js";
import { MOVEMENT_LABELS, STATUS_LABELS } from "@/lib/stock.js";
import { COST_BASIS_LABELS, canViewReports, dailyActivityReport, lowStockReport, movementRegister, stockOnHandReport, valuationSummary } from "@/services/reports.js";
import { listProductOptions } from "@/services/products.js";
import { getSettings } from "@/services/settings.js";
import { Card, EmptyState, FilterBar, FilterField, PageHeader, StatusBadge, MovementBadge } from "@/components/ui/index.jsx";
import { formatDateTime } from "@/lib/format.js";

export const metadata = { title: "Reports" };

function CsvLink({ href, children = "Download CSV" }) {
  return (
    <a href={href} className="btn btn-secondary btn-sm" download>
      ⬇ {children}
    </a>
  );
}

export default async function ReportsPage({ searchParams }) {
  const user = await requireUser();
  if (!(await canViewReports(user))) redirect("/forbidden");
  const sp = await searchParams;
  const filters = { from: str(sp.from), to: str(sp.to), productId: str(sp.product), type: str(sp.type) };
  const qs = new URLSearchParams(Object.entries({ from: filters.from, to: filters.to, product: filters.productId, type: filters.type }).filter(([, v]) => v)).toString();
  const suffix = qs ? `&${qs}` : "";

  const [stock, low, register, daily, valuation, products, settings] = await Promise.all([
    stockOnHandReport(user),
    lowStockReport(user),
    movementRegister(user, filters),
    dailyActivityReport(user, filters),
    valuationSummary(user),
    listProductOptions(user),
    getSettings(),
  ]);
  const cur = settings.currency;

  return (
    <>
      <PageHeader title="Reports" description="Reports reconcile with the stock ledger. Date filters apply to the movement-based reports." />

      <FilterBar action="/reports">
        <FilterField label="From" name="from" type="date" defaultValue={filters.from} />
        <FilterField label="To" name="to" type="date" defaultValue={filters.to} />
        <FilterField label="Product" name="product" defaultValue={filters.productId}>
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </FilterField>
        <FilterField label="Type" name="type" defaultValue={filters.type}>
          <option value="">All types</option>
          {Object.entries(MOVEMENT_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </FilterField>
      </FilterBar>

      <div className="space-y-6">
        <Card title="Stock on hand summary" actions={<CsvLink href="/api/reports/stock?format=csv" />}>
          <p className="mb-3 text-xs text-slate-600">
            <strong>Valuation basis:</strong> {stock.valuationNote} Archived products are included so history stays complete.
          </p>
          {stock.rows.length === 0 ? (
            <EmptyState title="No products" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <caption className="sr-only">Stock on hand</caption>
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">Category</th>
                    <th scope="col" className="num">On hand</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="num">Unit cost</th>
                    <th scope="col">Cost basis</th>
                    <th scope="col" className="num">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {r.name} <span className="text-xs text-slate-500">({r.sku}){!r.isActive && " · archived"}</span>
                      </td>
                      <td>{r.categoryName}</td>
                      <td className="num">{formatNumber(r.onHand)}</td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="num">{r.unitCost == null ? "—" : formatMoney(r.unitCost, cur)}</td>
                      <td className="text-xs">{COST_BASIS_LABELS[r.costBasis]}</td>
                      <td className="num">{formatMoney(r.value, cur)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="border-t border-slate-200 px-4 py-3" colSpan={2}>Totals ({stock.totals.products} products)</td>
                    <td className="num border-t border-slate-200 px-4 py-3">{formatNumber(stock.totals.units)}</td>
                    <td className="border-t border-slate-200" colSpan={3} />
                    <td className="num border-t border-slate-200 px-4 py-3">{formatMoney(stock.totals.value, cur)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>

        <Card title="Low and out-of-stock list" actions={<CsvLink href="/api/reports/low-stock?format=csv" />}>
          {low.rows.length === 0 ? (
            <EmptyState title="Nothing to reorder" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <caption className="sr-only">Low stock</caption>
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col" className="num">On hand</th>
                    <th scope="col" className="num">Reorder level</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {low.rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {r.name} <span className="text-xs text-slate-500">({r.sku})</span>
                      </td>
                      <td className="num">{formatNumber(r.onHand)}</td>
                      <td className="num">{formatNumber(r.reorderLevel)}</td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Valuation summary by category" actions={<CsvLink href="/api/reports/valuation?format=csv" />}>
          <p className="mb-3 text-xs text-slate-600">
            <strong>Basis:</strong> {valuation.valuationNote}
          </p>
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Valuation by category</caption>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col" className="num">Products</th>
                  <th scope="col" className="num">Units</th>
                  <th scope="col" className="num">Value</th>
                </tr>
              </thead>
              <tbody>
                {valuation.rows.map((r) => (
                  <tr key={r.category}>
                    <td>{r.category}</td>
                    <td className="num">{r.products}</td>
                    <td className="num">{formatNumber(r.units)}</td>
                    <td className="num">{formatMoney(r.value, cur)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className="border-t border-slate-200 px-4 py-3">Total</td>
                  <td className="num border-t border-slate-200 px-4 py-3">{valuation.totals.products}</td>
                  <td className="num border-t border-slate-200 px-4 py-3">{formatNumber(valuation.totals.units)}</td>
                  <td className="num border-t border-slate-200 px-4 py-3">{formatMoney(valuation.totals.value, cur)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        <Card title="Receipts and issues by date" actions={<CsvLink href={`/api/reports/daily?format=csv${suffix}`} />}>
          {daily.rows.length === 0 ? (
            <EmptyState title="No activity in this period" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <caption className="sr-only">Activity by date</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col" className="num">Received</th>
                    <th scope="col" className="num">Issued</th>
                    <th scope="col" className="num">Net adjustments</th>
                    <th scope="col" className="num">Movements</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.rows.map((r) => (
                    <tr key={r.date}>
                      <td>{formatDate(r.date)}</td>
                      <td className="num">{formatNumber(r.receipts)}</td>
                      <td className="num">{formatNumber(r.issues)}</td>
                      <td className="num">{r.adjustments}</td>
                      <td className="num">{r.movements}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="border-t border-slate-200 px-4 py-3">Totals</td>
                    <td className="num border-t border-slate-200 px-4 py-3">{formatNumber(daily.totals.receipts)}</td>
                    <td className="num border-t border-slate-200 px-4 py-3">{formatNumber(daily.totals.issues)}</td>
                    <td className="num border-t border-slate-200 px-4 py-3">{daily.totals.adjustments}</td>
                    <td className="border-t border-slate-200" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>

        <Card title="Stock movement register" actions={<CsvLink href={`/api/reports/movements?format=csv${suffix}`} />}>
          <p className="mb-3 text-sm text-slate-700">
            {register.totals.count} movements · in {formatNumber(register.totals.stockIn)} · out {formatNumber(register.totals.stockOut)} · adjusted +
            {formatNumber(register.totals.adjustedUp)} / −{formatNumber(register.totals.adjustedDown)} · net{" "}
            <strong>{register.totals.net}</strong>
          </p>
          {register.rows.length === 0 ? (
            <EmptyState title="No movements match the filters" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <caption className="sr-only">Movement register</caption>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Date</th>
                    <th scope="col">Product</th>
                    <th scope="col">Type</th>
                    <th scope="col" className="num">Qty</th>
                    <th scope="col">Reference / reason</th>
                    <th scope="col">By</th>
                  </tr>
                </thead>
                <tbody>
                  {register.rows.slice(0, 200).map((m) => (
                    <tr key={m.id}>
                      <td>{m.id}</td>
                      <td className="whitespace-nowrap">{formatDateTime(m.occurredAt)}</td>
                      <td>
                        {m.productName} <span className="text-xs text-slate-500">({m.sku})</span>
                      </td>
                      <td>
                        <MovementBadge type={m.type} />
                      </td>
                      <td className="num">{formatNumber(m.quantity)}</td>
                      <td>{m.reference ?? m.reason ?? "—"}</td>
                      <td>{m.performedByName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {register.rows.length > 200 && (
                <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-600">
                  Showing the latest 200 of {register.rows.length} rows. Totals above and the CSV include all of them.
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
      <p className="mt-4 text-xs text-slate-500">Status labels: {Object.values(STATUS_LABELS).join(" · ")}.</p>
    </>
  );
}
