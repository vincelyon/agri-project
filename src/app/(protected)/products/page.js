import Link from "next/link";
import { requireUser } from "@/lib/auth.js";
import { can } from "@/lib/permissions.js";
import { formatMoney, formatNumber } from "@/lib/format.js";
import { int, page as pageParam, str } from "@/lib/query.js";
import { getProduct, listProducts } from "@/services/products.js";
import { listCategories } from "@/services/categories.js";
import { getSettings } from "@/services/settings.js";
import { createProductAction, setProductActiveAction, updateProductAction } from "@/app/actions/catalog.js";
import { FormModal } from "@/components/ui/FormModal.jsx";
import { RowActionForm, RowActionLink, RowActionsMenu } from "@/components/ui/RowActionsMenu.jsx";
import { ActiveBadge, EmptyState, FilterBar, FilterField, PageHeader, Pagination, StatusBadge } from "@/components/ui/index.jsx";
import { ProductForm } from "./ProductForm.jsx";

export const metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const isAdmin = can(user, "catalog:write");
  const status = ["active", "archived", "all"].includes(str(sp.status)) ? str(sp.status) : "active";
  const filters = { search: str(sp.q), categoryId: int(sp.category), status };
  const pageNo = pageParam(sp.page);
  const editId = isAdmin ? int(sp.edit) : undefined;
  const isNew = isAdmin && str(sp.new) === "1";

  const [list, categories, settings, editing] = await Promise.all([
    listProducts(user, { ...filters, page: pageNo }),
    listCategories(user, { includeArchived: true }),
    getSettings(),
    editId ? getProduct(user, editId).catch(() => null) : null,
  ]);
  const usableCategories = categories.filter((c) => c.isActive || c.id === editing?.categoryId);
  const modalOpen = Boolean(editing) || isNew;

  return (
    <>
      <PageHeader
        title="Products"
        description="The agricultural product catalog. Quantities change only through stock movements."
        actions={
          isAdmin ? (
            <Link href="/products?new=1" className="btn btn-primary">
              Add product
            </Link>
          ) : null
        }
      />

      {isAdmin && (
        <FormModal
          open={modalOpen}
          title={editing ? `Edit ${editing.name}` : "Add product"}
          closeHref="/products"
          wide
        >
          <ProductForm
            key={editing?.id ?? "new"}
            action={editing ? updateProductAction : createProductAction}
            categories={usableCategories}
            units={settings.units}
            product={editing ?? undefined}
            submit={editing ? "Save changes" : "Add product"}
          />
        </FormModal>
      )}

      <FilterBar action="/products">
        <FilterField label="Search" name="q" defaultValue={filters.search} placeholder="Name or SKU" />
        <FilterField label="Category" name="category" defaultValue={filters.categoryId}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </FilterField>
        <FilterField label="Show" name="status" defaultValue={status}>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </FilterField>
      </FilterBar>

      {list.rows.length === 0 ? (
        <EmptyState title="No products found">
          {isAdmin ? "Use Add product to create the first one." : "Ask an administrator to add products."}
        </EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">Products</caption>
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Category</th>
                <th scope="col" className="num">
                  On hand
                </th>
                <th scope="col">Status</th>
                <th scope="col" className="num">
                  Buying
                </th>
                <th scope="col" className="num">
                  Selling
                </th>
                {isAdmin && <th scope="col">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {list.rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      {p.sku} · per {p.unit}
                    </p>
                  </td>
                  <td>{p.categoryName}</td>
                  <td className="num">{formatNumber(p.onHand)}</td>
                  <td>{p.isActive ? <StatusBadge status={p.status} /> : <ActiveBadge isActive={false} />}</td>
                  <td className="num">{p.buyingPrice == null ? "—" : formatMoney(p.buyingPrice, settings.currency)}</td>
                  <td className="num">{p.sellingPrice == null ? "—" : formatMoney(p.sellingPrice, settings.currency)}</td>
                  {isAdmin && (
                    <td>
                      <RowActionsMenu>
                        <RowActionLink href={`/products?edit=${p.id}`}>Edit</RowActionLink>
                        <RowActionForm
                          action={setProductActiveAction}
                          fields={{ id: p.id, isActive: String(!p.isActive) }}
                          label={p.isActive ? "Archive" : "Restore"}
                          confirmText={
                            p.isActive
                              ? `Archive ${p.name}? It stays in historical reports but can no longer receive stock movements.`
                              : undefined
                          }
                          danger={p.isActive}
                        />
                      </RowActionsMenu>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        basePath="/products"
        params={{ q: filters.search, category: filters.categoryId, status: status === "active" ? undefined : status }}
        page={list.page}
        pageSize={list.pageSize}
        total={list.total}
      />
    </>
  );
}
