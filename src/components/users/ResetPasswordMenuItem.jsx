"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { TempPasswordReveal } from "@/components/users/TempPasswordReveal.jsx";

function Submit({ name }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      role="menuitem"
      disabled={pending}
      className="row-actions__item"
      onClick={(e) => {
        if (!window.confirm(`Reset password for ${name}? A new temporary password will be generated.`)) {
          e.preventDefault();
        }
      }}
    >
      {pending ? "…" : "Reset password"}
    </button>
  );
}

/** Actions-menu item that resets a password and reveals the new temporary one. */
export function ResetPasswordMenuItem({ action, userId, userName, userEmail }) {
  const [state, formAction] = useActionState(action, { ok: null });
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (state.ok && state.data?.temporaryPassword) setShow(true);
  }, [state]);

  return (
    <li role="none">
      <form action={formAction}>
        <input type="hidden" name="id" value={userId} />
        <Submit name={userName} />
      </form>
      {state.ok === false && (
        <p role="alert" className="px-2 pb-1 text-xs font-medium text-red-700">
          {state.error}
        </p>
      )}
      {show && state.data?.temporaryPassword && (
        <dialog open className="form-modal form-modal--compact" onClose={() => setShow(false)}>
          <div className="form-modal__header">
            <h2 className="form-modal__title">Password reset</h2>
            <button type="button" className="form-modal__close" aria-label="Close" onClick={() => setShow(false)}>
              ×
            </button>
          </div>
          <div className="form-modal__body">
            <TempPasswordReveal
              email={userEmail}
              temporaryPassword={state.data.temporaryPassword}
              title="Password reset"
              doneHref="/users"
            />
          </div>
        </dialog>
      )}
    </li>
  );
}
