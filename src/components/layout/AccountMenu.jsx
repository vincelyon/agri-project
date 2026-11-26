"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

export function AccountMenu({ user, logoutAction }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const btnId = useId();
  const menuId = useId();
  const roleLabel = user.role === "ADMIN" ? "Administrator" : "Inventory attendant";
  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
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

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        type="button"
        id={btnId}
        className="account-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="account-menu__avatar" aria-hidden="true">
          {initials}
        </span>
        <span className="account-menu__meta">
          <span className="account-menu__name">{user.name}</span>
          <span className="account-menu__role">{roleLabel}</span>
        </span>
        <svg viewBox="0 0 20 20" fill="none" className="account-menu__caret" aria-hidden="true">
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div id={menuId} role="menu" aria-labelledby={btnId} className="account-menu__dropdown">
          <div className="account-menu__header">
            <p className="account-menu__name">{user.name}</p>
            <p className="account-menu__role">{roleLabel}</p>
          </div>
          <ul className="account-menu__list">
            <li role="none">
              <Link
                href="/change-password"
                role="menuitem"
                className="account-menu__item"
                onClick={() => setOpen(false)}
              >
                Password
              </Link>
            </li>
            <li role="none">
              <form action={logoutAction}>
                <button type="submit" role="menuitem" className="account-menu__item account-menu__item--danger">
                  Sign out
                </button>
              </form>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
