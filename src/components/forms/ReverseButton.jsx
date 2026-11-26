"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-danger btn-sm">
      {pending ? "…" : "Confirm reversal"}
    </button>
  );
}

/** Admin-only: post a compensating entry for a past movement, with a mandatory reason (BR-07). */
export function ReverseButton({ action, movementId }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, { ok: null });

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state]);

  return (
    <>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(true)}>
        Reverse
      </button>

      <dialog
        ref={dialogRef}
        className="form-modal form-modal--compact"
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
      >
        <div className="form-modal__header">
          <h2 id={titleId} className="form-modal__title">
            Reverse movement
          </h2>
          <button type="button" className="form-modal__close" aria-label="Close" onClick={() => setOpen(false)}>
            ×
          </button>
        </div>
        <div className="form-modal__body">
          <p className="mb-3 text-sm text-slate-600">
            This posts a compensating ledger entry. Give a clear reason for the audit trail.
          </p>
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="movementId" value={movementId} />
            <div>
              <label className="label" htmlFor={`reason-${movementId}`}>
                Reason <span className="text-red-600">*</span>
              </label>
              <input
                id={`reason-${movementId}`}
                name="reason"
                required
                placeholder="e.g. Entered against the wrong product"
                className="input"
              />
            </div>
            {state.ok === false && (
              <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                {state.error}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Submit />
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
