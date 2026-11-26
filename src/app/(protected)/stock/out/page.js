import Link from "next/link";
import { requireUser } from "@/lib/auth.js";
import { toDateInput } from "@/lib/format.js";
import { str } from "@/lib/query.js";
import { listProductOptions } from "@/services/products.js";
import { recentMovements } from "@/services/inventory.js";
import { getSettings } from "@/services/settings.js";
import { issueStockAction } from "@/app/actions/stock.js";
import { ActionForm, ProductSelect, SelectField, TextAreaField, TextField } from "@/components/forms/ActionForm.jsx";
import { FormModal } from "@/components/ui/FormModal.jsx";
import { EmptyState, PageHeader } from "@/components/ui/index.jsx";
import { MovementTable } from "../MovementTable.jsx";

export const metadata = { title: "Stock out" };

export default async function StockOutPage({ searchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const openForm = str(sp.new) === "1";
  const [products, recent, settings] = await Promise.all([
    listProductOptions(user),
    recentMovements(user, ["OUT"]),
    getSettings(),
  ]);

  return (
    <>
      <PageHeader
        title="Stock out"
        description="Record a sale or issue. Requests above the available quantity are rejected."
        actions={
          products.length > 0 ? (
            <Link href="/stock/out?new=1" className="btn btn-primary">
              New issue
            </Link>
          ) : null
        }
      />

      <FormModal open={openForm} title="New issue" closeHref="/stock/out" wide>
        {products.length === 0 ? (
          <EmptyState title="No active products" />
        ) : (
          <ActionForm action={issueStockAction} submit="Record issue">
            <div className="grid gap-4 sm:grid-cols-2">
              <ProductSelect products={products} />
              <TextField name="quantity" label="Quantity" type="number" min="1" step="1" required />
              <SelectField
                name="issueType"
                label="Issue type"
                defaultValue="SALE"
                options={[
                  { value: "SALE", label: "Sale" },
                  { value: "DISTRIBUTION", label: "Distribution" },
                  { value: "INTERNAL_USE", label: "Internal use" },
                ]}
                required
              />
              <TextField name="occurredAt" label="Date" type="date" defaultValue={toDateInput()} max={toDateInput()} />
              <TextField name="recipient" label="Customer / destination (optional)" />
              <TextField name="reference" label="Reference (optional)" hint="Receipt or voucher number" />
            </div>
            <TextAreaField name="notes" label="Notes (optional)" rows={2} />
          </ActionForm>
        )}
      </FormModal>

      <h2 className="mb-3 text-base font-semibold">Latest issues</h2>
      {recent.length === 0 ? (
        <EmptyState title="No issues yet">Use New issue to record the first one.</EmptyState>
      ) : (
        <MovementTable
          rows={recent}
          currency={settings.currency}
          columns={["date", "product", "type", "qty", "party", "ref", "by"]}
        />
      )}
    </>
  );
}
