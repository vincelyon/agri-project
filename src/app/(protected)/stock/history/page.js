import { requireUser } from "@/lib/auth.js";
import { can } from "@/lib/permissions.js";
import { int, page as pageParam, str } from "@/lib/query.js";
import { MOVEMENT_LABELS } from "@/lib/stock.js";
import { listMovements } from "@/services/inventory.js";
import { listProductOptions } from "@/services/products.js";
import { getSettings } from "@/services/settings.js";
import { reverseMovementAction } from "@/app/actions/stock.js";
import { ReverseButton } from "@/components/forms/ReverseButton.jsx";
import { EmptyState, FilterBar, FilterField, PageHeader, Pagination } from "@/components/ui/index.jsx";
import { MovementTable } from "../MovementTable.jsx";

export const metadata = { title: "Movement history" };

export default async function HistoryPage({ searchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const filters = { from: str(sp.from), to: str(sp.to), productId: str(sp.product), type: str(sp.type) };
  const pageNo = pageParam(sp.page);
  const isAdmin = can(user, "stock:reverse");

  const [history, products, settings] = await Promise.all([
    listMovements(user, filters, { page: pageNo }),
    listProductOptions(user),
    getSettings(),
  ]);

  return (
    <>
      <PageHeader
        title="Movement history"
        description="The append-only stock ledger. Past entries are never edited; administrators can post a reversal with a reason."
      />
      <FilterBar action="/stock/history">
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
          {Object.entries(MOVEMENT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </FilterField>
      </FilterBar>

      {history.rows.length === 0 ? (
        <EmptyState title="No movements match" />
      ) : (
        <MovementTable
          rows={history.rows}
          currency={settings.currency}
          columns={["date", "product", "type", "qty", "party", "ref", "by"]}
          renderActions={
            isAdmin
              ? (m) =>
                  m.reversalOfId || m.isReversed ? (
                    <span className="text-xs text-slate-500">—</span>
                  ) : (
                    <ReverseButton action={reverseMovementAction} movementId={m.id} />
                  )
              : undefined
          }
        />
      )}
      <Pagination basePath="/stock/history" params={{ from: filters.from, to: filters.to, product: filters.productId, type: filters.type }} page={history.page} pageSize={history.pageSize} total={history.total} />
    </>
  );
}
