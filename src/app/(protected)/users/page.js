import Link from "next/link";
import { requirePermission } from "@/lib/auth.js";
import { formatDate } from "@/lib/format.js";
import { int, str } from "@/lib/query.js";
import { getUser, listUsers } from "@/services/users.js";
import {
  createUserAction,
  resetUserPasswordAction,
  toggleUserActiveAction,
  updateUserAction,
} from "@/app/actions/admin.js";
import { ActionForm, CheckboxField, SelectField, TextField } from "@/components/forms/ActionForm.jsx";
import { FormModal } from "@/components/ui/FormModal.jsx";
import { RowActionForm, RowActionLink, RowActionsMenu } from "@/components/ui/RowActionsMenu.jsx";
import { ActiveBadge, PageHeader } from "@/components/ui/index.jsx";
import { CreateUserForm } from "@/components/users/CreateUserForm.jsx";
import { ResetPasswordMenuItem } from "@/components/users/ResetPasswordMenuItem.jsx";

export const metadata = { title: "Users" };

const ROLE_OPTIONS = [
  { value: "STAFF", label: "Inventory attendant" },
  { value: "ADMIN", label: "Administrator" },
];

export default async function UsersPage({ searchParams }) {
  const admin = await requirePermission("users:manage");
  const sp = await searchParams;
  const editId = int(sp.edit);
  const isNew = str(sp.new) === "1";
  const [users, editing] = await Promise.all([
    listUsers(admin),
    editId ? getUser(admin, editId).catch(() => null) : null,
  ]);
  const modalOpen = Boolean(editing) || isNew;

  return (
    <>
      <PageHeader
        title="Users"
        description="Create accounts, assign roles and deactivate people who should no longer have access."
        actions={
          <Link href="/users?new=1" className="btn btn-primary">
            Add user
          </Link>
        }
      />

      <FormModal open={modalOpen} title={editing ? `Edit ${editing.name}` : "Add user"} closeHref="/users">
        {editing ? (
          <ActionForm key={editing.id} action={updateUserAction} submit="Save changes">
            <input type="hidden" name="id" value={editing.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="name" label="Name" defaultValue={editing.name} required />
              <SelectField name="role" label="Role" defaultValue={editing.role} options={ROLE_OPTIONS} required />
              <div className="self-end pb-2 sm:col-span-2">
                <CheckboxField name="isActive" label="Account is active" defaultChecked={editing.isActive} />
              </div>
            </div>
          </ActionForm>
        ) : (
          <CreateUserForm action={createUserAction} roleOptions={ROLE_OPTIONS} />
        )}
      </FormModal>

      <div className="table-wrap">
        <table className="table">
          <caption className="sr-only">Users</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
              <th scope="col">Created</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium">
                  {u.name}
                  {u.id === admin.id && <span className="ml-2 text-xs text-slate-500">(you)</span>}
                </td>
                <td>{u.email}</td>
                <td>{u.role === "ADMIN" ? "Administrator" : "Inventory attendant"}</td>
                <td>
                  <ActiveBadge isActive={u.isActive} />
                  {u.mustChangePassword && <p className="mt-1 text-xs text-orange-700">Must change password</p>}
                </td>
                <td>{formatDate(u.createdAt)}</td>
                <td>
                  <RowActionsMenu>
                    <RowActionLink href={`/users?edit=${u.id}`}>Edit</RowActionLink>
                    <ResetPasswordMenuItem
                      action={resetUserPasswordAction}
                      userId={u.id}
                      userName={u.name}
                      userEmail={u.email}
                    />
                    {u.id !== admin.id && (
                      <RowActionForm
                        action={toggleUserActiveAction}
                        fields={{ id: u.id, isActive: String(!u.isActive) }}
                        label={u.isActive ? "Deactivate" : "Reactivate"}
                        confirmText={
                          u.isActive ? `Deactivate ${u.name}? They will be unable to sign in.` : undefined
                        }
                        danger={u.isActive}
                      />
                    )}
                  </RowActionsMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
