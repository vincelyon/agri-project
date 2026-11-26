import Link from "next/link";
import { requirePermission } from "@/lib/auth.js";
import { str } from "@/lib/query.js";
import { getSettings } from "@/services/settings.js";
import { updateSettingsAction } from "@/app/actions/admin.js";
import { ActionForm, TextAreaField, TextField } from "@/components/forms/ActionForm.jsx";
import { FormModal } from "@/components/ui/FormModal.jsx";
import { PageHeader } from "@/components/ui/index.jsx";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }) {
  const admin = await requirePermission("settings:manage");
  const sp = await searchParams;
  const openForm = str(sp.edit) === "1";
  const settings = await getSettings();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Shop name, currency, and preferred units. Reorder levels are set on each product."
        actions={
          <Link href="/settings?edit=1" className="btn btn-primary">
            Edit settings
          </Link>
        }
      />

      <div className="card max-w-2xl">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Shop name</dt>
            <dd className="mt-1 font-medium text-ink">{settings.shopName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Currency</dt>
            <dd className="mt-1 font-medium text-ink">{settings.currency}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Preferred units</dt>
            <dd className="mt-1 font-medium text-ink">{settings.units.join(", ")}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-slate-500">Signed in as {admin.email}.</p>
      </div>

      <FormModal open={openForm} title="Edit settings" closeHref="/settings">
        <ActionForm action={updateSettingsAction} submit="Save settings">
          <TextField name="shopName" label="Shop name" defaultValue={settings.shopName} required />
          <TextField
            name="currency"
            label="Currency code"
            defaultValue={settings.currency}
            required
            hint="3-letter code shown on money values, e.g. ZMW"
            maxLength={3}
          />
          <TextAreaField
            name="units"
            label="Preferred units"
            defaultValue={settings.units.join(", ")}
            hint="Comma- or line-separated; suggested when creating products."
            required
          />
        </ActionForm>
      </FormModal>
    </>
  );
}
