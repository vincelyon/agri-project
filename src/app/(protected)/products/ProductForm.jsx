import { ActionForm, SelectField, TextField } from "@/components/forms/ActionForm.jsx";

export function ProductForm({ action, categories, units, product, submit, onSuccess }) {
  const isEdit = Boolean(product);
  return (
    <ActionForm action={action} submit={submit} onSuccess={onSuccess}>
      {isEdit && <input type="hidden" name="id" value={product.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="sku" label="SKU" defaultValue={product?.sku} required hint="Unique code, e.g. UREA-50" />
        <TextField name="name" label="Name" defaultValue={product?.name} required />
        <SelectField
          name="categoryId"
          label="Category"
          defaultValue={product?.categoryId ?? ""}
          placeholder="Select a category…"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          required
        />
        <div>
          <TextField name="unit" label="Unit" defaultValue={product?.unit} required list="unit-options" hint="Smallest stocking unit (whole numbers only)" />
          <datalist id="unit-options">
            {units.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>
        <TextField name="reorderLevel" label="Reorder level" type="number" min="0" step="1" defaultValue={product?.reorderLevel ?? 0} required hint="Alert when on-hand falls to this level" />
        {!isEdit && (
          <TextField name="openingQuantity" label="Opening quantity" type="number" min="0" step="1" defaultValue="0" hint="Recorded as an initial stock-in movement" />
        )}
        <TextField name="buyingPrice" label="Buying price (optional)" type="number" min="0" step="0.01" defaultValue={product?.buyingPrice ?? ""} />
        <TextField name="sellingPrice" label="Selling price (optional)" type="number" min="0" step="0.01" defaultValue={product?.sellingPrice ?? ""} />
      </div>
    </ActionForm>
  );
}
