import Link from "next/link";
import { requireUser } from "@/lib/auth.js";
import { toDateInput } from "@/lib/format.js";
import { str } from "@/lib/query.js";
import { listProductOptions } from "@/services/products.js";
import { recentMovements } from "@/services/inventory.js";
import { getSettings } from "@/services/settings.js";
import { receiveStockAction } from "@/app/actions/stock.js";
import { ActionForm, ProductSelect, TextAreaField, TextField } from "@/components/forms/ActionForm.jsx";
import { FormModal } from "@/components/ui/FormModal.jsx";
import { EmptyState, PageHeader } from "@/components/ui/index.jsx";
import { MovementTable } from "../MovementTable.jsx";

export const metadata = { title: "Stock in" };

export default async function StockInPage({ searchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const openForm = str(sp.new) === "1";
  const [products, recent, settings] = await Promise.all([
    listProductOptions(user),
    recentMovements(user, ["IN"]),
    getSettings(),
  ]);

  return (
    <>
      <PageHeader
        title="Stock in"
        description="Record stock received into the shop."
        actions={
          products.length > 0 ? (
            <Link href="/stock/in?new=1" className="btn btn-primary">
              New receipt
            </Link>
          ) : null
        }
      />

      <FormModal open={openForm} title="New receipt" closeHref="/stock/in" wide>
        {products.length === 0 ? (
          <EmptyState title="No active products">Add products in the catalog before receiving stock.</EmptyState>
        ) : (
          <ActionForm action={receiveStockAction} submit="Record receipt">
            <div className="grid gap-4 sm:grid-cols-2">
              <ProductSelect products={products} />
              <TextField name="quantity" label="Quantity" type="number" min="1" step="1" required />
              <TextField
                name="occurredAt"
                label="Date received"
                type="date"
                defaultValue={toDateInput()}
                max={toDateInput()}
              />
              <TextField
                name="unitCost"
                label={`Unit cost (${settings.currency}, optional)`}
                type="number"
                min="0"
                step="0.01"
              />
              <TextField name="reference" label="Reference (optional)" hint="Delivery note or invoice number" />
            </div>
            <TextAreaField name="notes" label="Notes (optional)" rows={2} />
          </ActionForm>
        )}
      </FormModal>

      <h2 className="mb-3 text-base font-semibold">Latest receipts</h2>
      {recent.length === 0 ? (
        <EmptyState title="No receipts yet">Use New receipt to record the first one.</EmptyState>
      ) : (
        <MovementTable rows={recent} currency={settings.currency} columns={["date", "product", "qty", "ref", "by"]} />
      )}
    </>
  );
}
