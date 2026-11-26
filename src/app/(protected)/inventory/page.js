import { requireUser } from "@/lib/auth.js";
import { formatNumber } from "@/lib/format.js";
import { int, str } from "@/lib/query.js";
import { listInventory } from "@/services/inventory.js";
import { listCategories } from "@/services/categories.js";
import { EmptyState, FilterBar, FilterField, PageHeader, StatusBadge } from "@/components/ui/index.jsx";

export const metadata = { title: "Inventory" };

export default async function InventoryPage({ searchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const status = ["OUT", "LOW", "NORMAL"].includes(str(sp.status)) ? str(sp.status) : undefined;
  const filters = { search: str(sp.q), categoryId: int(sp.category), status };
  const [rows, categories] = await Promise.all([listInventory(user, filters), listCategories(user)]);

  return (
    <>
      <PageHeader title="Inventory" description="Current balance and reorder status for every active product." />
      <FilterBar action="/inventory">
        <FilterField label="Search" name="q" defaultValue={filters.search} placeholder="Name or SKU" />
        <FilterField label="Category" name="category" defaultValue={filters.categoryId}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </FilterField>
        <FilterField label="Status" name="status" defaultValue={status}>
          <option value="">All</option>
          <option value="OUT">Out of stock</option>
          <option value="LOW">Low stock</option>
          <option value="NORMAL">Normal</option>
        </FilterField>
      </FilterBar>

      {rows.length === 0 ? (
        <EmptyState title="No products match">Adjust the filters or add products in the catalog.</EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">Stock balances</caption>
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Category</th>
                <th scope="col" className="num">On hand</th>
                <th scope="col" className="num">Reorder level</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-slate-500">{r.sku}</p>
                  </td>
                  <td>{r.categoryName}</td>
                  <td className="num font-medium">
                    {formatNumber(r.onHand)} <span className="text-xs font-normal text-slate-500">{r.unit}</span>
                  </td>
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
    </>
  );
}
