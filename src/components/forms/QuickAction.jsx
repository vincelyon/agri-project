"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

function Button({ label, className, confirmText }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {pending ? "…" : label}
    </button>
  );
}

/** Small one-click mutation (archive, restore, deactivate…) with confirmation and inline errors. */
export function QuickAction({ action, fields = {}, label, confirmText, variant = "secondary" }) {
  const [state, formAction] = useActionState(action, { ok: null });
  return (
    <form action={formAction} className="inline-flex flex-col items-start gap-1">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Button label={label} confirmText={confirmText} className={`btn btn-sm ${variant === "danger" ? "btn-danger" : "btn-secondary"}`} />
      {state.ok === false && (
        <span role="alert" className="max-w-xs text-xs font-medium text-red-700">
          {state.error}
        </span>
      )}
    </form>
  );
}
