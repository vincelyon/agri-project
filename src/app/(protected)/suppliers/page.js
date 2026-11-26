import Link from "next/link";
import { requireUser } from "@/lib/auth.js";
import { can } from "@/lib/permissions.js";
import { int, str } from "@/lib/query.js";
import { getSupplier, listSuppliers } from "@/services/suppliers.js";
import { createSupplierAction, setSupplierActiveAction, updateSupplierAction } from "@/app/actions/catalog.js";
import { ActionForm, TextField } from "@/components/forms/ActionForm.jsx";
import { FormModal } from "@/components/ui/FormModal.jsx";
import { RowActionForm, RowActionLink, RowActionsMenu } from "@/components/ui/RowActionsMenu.jsx";
import { ActiveBadge, EmptyState, FilterBar, FilterField, PageHeader } from "@/components/ui/index.jsx";

export const metadata = { title: "Suppliers" };

export default async function SuppliersPage({ searchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const isAdmin = can(user, "catalog:write");
  const editId = isAdmin ? int(sp.edit) : undefined;
  const isNew = isAdmin && str(sp.new) === "1";
  const search = str(sp.q);
  const [suppliers, editing] = await Promise.all([
    listSuppliers(user, { includeArchived: true, search }),
    editId ? getSupplier(user, editId).catch(() => null) : null,
  ]);
  const modalOpen = Boolean(editing) || isNew;

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Companies you buy stock from. Archived suppliers remain linked to past receipts."
        actions={
          isAdmin ? (
            <Link href="/suppliers?new=1" className="btn btn-primary">
              Add supplier
            </Link>
          ) : null
        }
      />

      {isAdmin && (
        <FormModal
          open={modalOpen}
          title={editing ? `Edit ${editing.name}` : "Add supplier"}
          closeHref="/suppliers"
        >
          <ActionForm
            key={editing?.id ?? "new"}
            action={editing ? updateSupplierAction : createSupplierAction}
            submit={editing ? "Save changes" : "Add supplier"}
          >
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="name" label="Name" defaultValue={editing?.name} required />
              <TextField name="phone" label="Phone" defaultValue={editing?.phone ?? ""} type="tel" />
              <TextField name="email" label="Email" defaultValue={editing?.email ?? ""} type="email" />
              <TextField name="address" label="Address" defaultValue={editing?.address ?? ""} />
            </div>
          </ActionForm>
        </FormModal>
      )}

      <FilterBar action="/suppliers">
        <FilterField label="Search" name="q" defaultValue={search} placeholder="Name, phone or email" />
      </FilterBar>

      {suppliers.length === 0 ? (
        <EmptyState title="No suppliers found">
          {isAdmin ? "Use Add supplier to create the first one." : null}
        </EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">Suppliers</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Phone</th>
                <th scope="col">Email</th>
                <th scope="col">Address</th>
                <th scope="col">Status</th>
                {isAdmin && <th scope="col">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{s.name}</td>
                  <td>{s.phone ?? "—"}</td>
                  <td>{s.email ?? "—"}</td>
                  <td>{s.address ?? "—"}</td>
                  <td>
                    <ActiveBadge isActive={s.isActive} />
                  </td>
                  {isAdmin && (
                    <td>
                      <RowActionsMenu>
                        <RowActionLink href={`/suppliers?edit=${s.id}`}>Edit</RowActionLink>
                        <RowActionForm
                          action={setSupplierActiveAction}
                          fields={{ id: s.id, isActive: String(!s.isActive) }}
                          label={s.isActive ? "Archive" : "Restore"}
                          confirmText={s.isActive ? `Archive supplier ${s.name}?` : undefined}
                          danger={s.isActive}
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
    </>
  );
}
