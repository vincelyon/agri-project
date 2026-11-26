"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const ICONS = {
  Dashboard: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M3 3h6v6H3V3Zm8 0h6v4h-6V3ZM3 11h6v6H3v-6Zm8 2h6v4h-6v-4Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  Inventory: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M3.5 6.5 10 3l6.5 3.5L10 10 3.5 6.5Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 10 10 13.5 16.5 10M3.5 13.5 10 17l6.5-3.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  "Stock in (receipts)": (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M10 4v9M6.5 9.5 10 13l3.5-3.5M4 16h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  "Stock out (issues)": (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M10 13V4M6.5 7.5 10 4l3.5 3.5M4 16h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Adjustments: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M4 6h8M12 6a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM16 14H8M8 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  "Movement history": (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6v4.5l3 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Products: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <rect x="3.5" y="4.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 8h6M7 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Categories: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M4 5h5v5H4V5Zm7 0h5v5h-5V5ZM4 12h5v5H4v-5Zm7 0h5v5h-5v-5Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  Suppliers: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M4 16v-1.5A3.5 3.5 0 0 1 7.5 11h1A3.5 3.5 0 0 1 12 14.5V16M12.5 11h.5A3.5 3.5 0 0 1 16.5 14.5V16" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="7" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="13.5" cy="7.5" r="1.75" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  Reports: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M5 15V9M10 15V5M15 15v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Users: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <circle cx="7.5" cy="7.5" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 15.5a4 4 0 0 1 8 0" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="13.75" cy="7.75" r="1.75" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13 12.5a3.2 3.2 0 0 1 3.5 3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  "Audit log": (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M6 4.5h8A1.5 1.5 0 0 1 15.5 6v10L13 14.5H6A1.5 1.5 0 0 1 4.5 13V6A1.5 1.5 0 0 1 6 4.5Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  Settings: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <circle cx="10" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 3.5v2M10 14.5v2M3.5 10h2M14.5 10h2M5.4 5.4l1.4 1.4M13.2 13.2l1.4 1.4M14.6 5.4l-1.4 1.4M6.8 13.2l-1.4 1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

function NavIcon({ label }) {
  return ICONS[label] ?? (
    <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
  );
}

export function Sidebar({ shopName, items }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav aria-label="Main navigation" className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {items.map((group) => (
        <div key={group.heading}>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{group.heading}</p>
          <ul className="space-y-1">
            {group.links.map((link) => {
              const active =
                pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href + "/"));
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                      active ? "bg-surface-2 text-ink shadow-sm" : "text-slate-600 hover:bg-surface hover:text-ink"
                    }`}
                  >
                    <span className={active ? "text-brand-700" : "text-slate-400"}>
                      <NavIcon label={link.label} />
                    </span>
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-700 text-sm font-bold text-white">
            A
          </span>
          <span className="font-semibold text-ink">{shopName}</span>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </header>
      {open && (
        <div id="mobile-nav" className="flex max-h-[80vh] flex-col border-b border-line bg-white lg:hidden">
          {nav}
        </div>
      )}
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r border-line bg-white lg:flex">
        <div className="flex items-center gap-3 border-b border-line px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-sm font-bold text-white shadow-sm">
            A
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-ink">{shopName}</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Stock Manager</p>
          </div>
        </div>
        {nav}
      </aside>
    </>
  );
}
