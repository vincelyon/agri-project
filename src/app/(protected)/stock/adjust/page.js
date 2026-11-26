import Link from "next/link";
import { requirePermission } from "@/lib/auth.js";
import { str } from "@/lib/query.js";
import { listProductOptions } from "@/services/products.js";
import { recentMovements } from "@/services/inventory.js";
import { getSettings } from "@/services/settings.js";
import { adjustStockAction } from "@/app/actions/stock.js";
import { ActionForm, ProductSelect, SelectField, TextAreaField, TextField } from "@/components/forms/ActionForm.jsx";
import { FormModal } from "@/components/ui/FormModal.jsx";
import { EmptyState, PageHeader } from "@/components/ui/index.jsx";
import { MovementTable } from "../MovementTable.jsx";

export const metadata = { title: "Stock adjustments" };

export default async function AdjustPage({ searchParams }) {
  const user = await requirePermission("stock:adjust");
  const sp = await searchParams;
  const openForm = str(sp.new) === "1";
  const [products, recent, settings] = await Promise.all([
    listProductOptions(user),
    recentMovements(user, ["ADJUST_IN", "ADJUST_OUT"]),
    getSettings(),
  ]);

  return (
    <>
      <PageHeader
        title="Stock adjustments"
        description="Administrator corrections for damaged, expired, lost or counted stock. Every adjustment needs a reason and is audited."
        actions={
          products.length > 0 ? (
            <Link href="/stock/adjust?new=1" className="btn btn-primary">
              New adjustment
            </Link>
          ) : null
        }
      />

      <FormModal open={openForm} title="New adjustment" closeHref="/stock/adjust" wide>
        {products.length === 0 ? (
          <EmptyState title="No active products" />
        ) : (
          <ActionForm action={adjustStockAction} submit="Record adjustment">
            <div className="grid gap-4 sm:grid-cols-2">
              <ProductSelect products={products} />
              <SelectField
                name="direction"
                label="Direction"
                defaultValue="OUT"
                options={[
                  { value: "OUT", label: "Decrease stock (damaged, expired, lost)" },
                  { value: "IN", label: "Increase stock (count correction)" },
                ]}
                required
              />
              <TextField name="quantity" label="Quantity" type="number" min="1" step="1" required />
              <TextField name="reference" label="Reference (optional)" />
            </div>
            <TextAreaField
              name="reason"
              label="Reason"
              rows={2}
              required
              hint="Required, e.g. “Bags damaged by rain”"
            />
          </ActionForm>
        )}
      </FormModal>

      <h2 className="mb-3 text-base font-semibold">Recent adjustments</h2>
      {recent.length === 0 ? (
        <EmptyState title="No adjustments yet">Use New adjustment to record the first one.</EmptyState>
      ) : (
        <MovementTable
          rows={recent}
          currency={settings.currency}
          columns={["date", "product", "type", "qty", "ref", "by"]}
        />
      )}
    </>
  );
}
