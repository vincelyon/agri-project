"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

/**
 * Popup dialog for create/edit forms. Open state comes from the URL
 * (`?new=1` / `?edit=id`). Escape, ×, and backdrop click all navigate to
 * `closeHref` through one dismiss path.
 */
export function FormModal({ open, title, closeHref, children, wide = false }) {
  const dialogRef = useRef(null);
  const router = useRouter();
  const navLock = useRef(false);

  const dismiss = useCallback(() => {
    if (navLock.current) return;
    navLock.current = true;
    router.push(closeHref);
  }, [closeHref, router]);

  // Keep the native dialog in sync with the URL-driven `open` prop.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    if (open) {
      navLock.current = false;
      if (!el.open) el.showModal();
      return;
    }

    if (el.open) el.close();
  }, [open]);

  // Escape (cancel): route away; `open` then becomes false and the effect closes it.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    function onCancel(e) {
      e.preventDefault();
      dismiss();
    }

    el.addEventListener("cancel", onCancel);
    return () => el.removeEventListener("cancel", onCancel);
  }, [dismiss]);

  return (
    <dialog
      ref={dialogRef}
      className={`form-modal ${wide ? "form-modal--wide" : ""}`}
      aria-labelledby="form-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div className="form-modal__panel">
        <div className="form-modal__header">
          <h2 id="form-modal-title" className="form-modal__title">
            {title}
          </h2>
          <button type="button" className="form-modal__close" aria-label="Close" onClick={dismiss}>
            ×
          </button>
        </div>
        <div className="form-modal__body">{children}</div>
      </div>
    </dialog>
  );
}
