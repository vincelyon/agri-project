"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionForm, SelectField, SubmitButton, TextField } from "@/components/forms/ActionForm.jsx";
import { TempPasswordReveal } from "@/components/users/TempPasswordReveal.jsx";

export function CreateUserForm({ action, roleOptions }) {
  const [created, setCreated] = useState(null);

  if (created?.temporaryPassword) {
    return (
      <TempPasswordReveal
        email={created.email}
        temporaryPassword={created.temporaryPassword}
        title="User created"
        doneHref="/users"
      />
    );
  }

  return (
    <>
      <p className="mb-4 text-sm text-slate-600">
        A temporary password is generated automatically. Share it once — the user must change it at
        first sign-in.
      </p>
      <ActionForm
        action={action}
        submit={null}
        onSuccess={(state) => setCreated(state.data)}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="name" label="Name" required />
          <TextField name="email" label="Email" type="email" required />
          <SelectField name="role" label="Role" defaultValue="STAFF" options={roleOptions} required />
        </div>
        <div className="form-modal__footer">
          <Link href="/users" className="btn btn-secondary" replace>
            Cancel
          </Link>
          <SubmitButton>Create user</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
