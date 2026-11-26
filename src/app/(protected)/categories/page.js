import Link from "next/link";
import { requireUser } from "@/lib/auth.js";
import { can } from "@/lib/permissions.js";
import { int, str } from "@/lib/query.js";
import { getCategory, listCategories } from "@/services/categories.js";
import { createCategoryAction, setCategoryActiveAction, updateCategoryAction } from "@/app/actions/catalog.js";
import { ActionForm, TextAreaField, TextField } from "@/components/forms/ActionForm.jsx";
import { FormModal } from "@/components/ui/FormModal.jsx";
import { RowActionForm, RowActionLink, RowActionsMenu } from "@/components/ui/RowActionsMenu.jsx";
import { ActiveBadge, EmptyState, PageHeader } from "@/components/ui/index.jsx";

export const metadata = { title: "Categories" };

export default async function CategoriesPage({ searchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const isAdmin = can(user, "catalog:write");
  const editId = isAdmin ? int(sp.edit) : undefined;
  const isNew = isAdmin && str(sp.new) === "1";
  const [categories, editing] = await Promise.all([
    listCategories(user, { includeArchived: true }),
    editId ? getCategory(user, editId).catch(() => null) : null,
  ]);
  const modalOpen = Boolean(editing) || isNew;

  return (
    <>
      <PageHeader
        title="Categories"
        description="Group products, e.g. Fertilizer, Seed, Pesticide or Farm Tool. Categories are archived, never deleted."
        actions={
          isAdmin ? (
            <Link href="/categories?new=1" className="btn btn-primary">
              Add category
            </Link>
          ) : null
        }
      />

      {isAdmin && (
        <FormModal
          open={modalOpen}
          title={editing ? `Edit ${editing.name}` : "Add category"}
          closeHref="/categories"
        >
          <ActionForm
            key={editing?.id ?? "new"}
            action={editing ? updateCategoryAction : createCategoryAction}
            submit={editing ? "Save changes" : "Add category"}
          >
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="name" label="Name" defaultValue={editing?.name} required />
              <TextAreaField
                name="description"
                label="Description (optional)"
                defaultValue={editing?.description ?? ""}
                rows={2}
              />
            </div>
          </ActionForm>
        </FormModal>
      )}

      {categories.length === 0 ? (
        <EmptyState title="No categories yet">
          {isAdmin ? "Use Add category to create the first one." : null}
        </EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">Categories</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Description</th>
                <th scope="col" className="num">
                  Products
                </th>
                <th scope="col">Status</th>
                {isAdmin && <th scope="col">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td className="text-slate-600">{c.description ?? "—"}</td>
                  <td className="num">{c.productCount}</td>
                  <td>
                    <ActiveBadge isActive={c.isActive} />
                  </td>
                  {isAdmin && (
                    <td>
                      <RowActionsMenu>
                        <RowActionLink href={`/categories?edit=${c.id}`}>Edit</RowActionLink>
                        <RowActionForm
                          action={setCategoryActiveAction}
                          fields={{ id: c.id, isActive: String(!c.isActive) }}
                          label={c.isActive ? "Archive" : "Restore"}
                          confirmText={c.isActive ? `Archive category ${c.name}?` : undefined}
                          danger={c.isActive}
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
