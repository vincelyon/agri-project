"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";

function CogIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
      <circle cx="10" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 3.5v2M10 14.5v2M3.5 10h2M14.5 10h2M5.4 5.4l1.4 1.4M13.2 13.2l1.4 1.4M14.6 5.4l-1.4 1.4M6.8 13.2l-1.4 1.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Pest Risk–style row “Actions” dropdown.
 * Menu is portaled to document.body so table overflow cannot clip it.
 */
export function RowActionsMenu({ children, label = "Actions" }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const btnId = useId();
  const menuId = useId();

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;

    function place() {
      const btn = btnRef.current;
      const menu = menuRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const menuW = menu?.offsetWidth || 176;
      const menuH = menu?.offsetHeight || 160;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top =
        spaceBelow < menuH + 8 && rect.top > menuH + 8 ? rect.top - menuH - 6 : rect.bottom + 6;
      let left = rect.right - menuW;
      if (left < 8) left = 8;
      if (left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8;
      setCoords({ top, left });
    }

    place();
    // Re-measure after paint once menu has real height
    const id = requestAnimationFrame(place);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onDoc(e) {
      const inTrigger = rootRef.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inTrigger && !inMenu) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menu =
    open && mounted
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-labelledby={btnId}
            className="row-actions__menu"
            style={{ top: coords.top, left: coords.left }}
          >
            <ul className="row-actions__list">{children}</ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`row-actions ${open ? "is-open" : ""}`} ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        id={btnId}
        className="row-actions__btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <CogIcon />
        <span className="row-actions__label">{label}</span>
      </button>
      {menu}
    </div>
  );
}

export function RowActionLink({ href, children }) {
  return (
    <li role="none">
      <Link href={href} role="menuitem" className="row-actions__item" prefetch={false}>
        {children}
      </Link>
    </li>
  );
}

export function RowActionItem({ children, onClick, danger = false }) {
  return (
    <li role="none">
      <button
        type="button"
        role="menuitem"
        className={`row-actions__item ${danger ? "row-actions__item--danger" : ""}`}
        onClick={onClick}
      >
        {children}
      </button>
    </li>
  );
}

function MenuSubmit({ label, confirmText, danger }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      role="menuitem"
      disabled={pending}
      className={`row-actions__item ${danger ? "row-actions__item--danger" : ""}`}
      onClick={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {pending ? "…" : label}
    </button>
  );
}

/** Menu item that posts a server action (archive, deactivate, …). */
export function RowActionForm({ action, fields = {}, label, confirmText, danger = false }) {
  const [state, formAction] = useActionState(action, { ok: null });
  return (
    <li role="none">
      <form action={formAction}>
        {Object.entries(fields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <MenuSubmit label={label} confirmText={confirmText} danger={danger} />
      </form>
      {state.ok === false && (
        <p role="alert" className="px-2 pb-1 text-xs font-medium text-red-700">
          {state.error}
        </p>
      )}
    </li>
  );
}
