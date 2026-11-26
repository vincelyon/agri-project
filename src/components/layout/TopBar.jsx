"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/layout/AccountMenu.jsx";

const LABELS = {
  dashboard: "Dashboard",
  inventory: "Inventory",
  products: "Products",
  categories: "Categories",
  suppliers: "Suppliers",
  reports: "Reports",
  users: "Users",
  audit: "Audit log",
  settings: "Settings",
  stock: "Stock",
  in: "Stock in",
  out: "Stock out",
  adjust: "Adjustments",
  history: "Movement history",
  "change-password": "Change password",
};

function crumbsFromPath(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return [{ href: "/dashboard", label: "Dashboard" }];
  const crumbs = [{ href: "/dashboard", label: "Home" }];
  let href = "";
  for (const part of parts) {
    href += `/${part}`;
    crumbs.push({ href, label: LABELS[part] ?? part });
  }
  return crumbs;
}

export function TopBar({ shopName, user, logoutAction }) {
  const pathname = usePathname();
  const crumbs = crumbsFromPath(pathname);

  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-white/90 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
            <span className="font-semibold text-ink">{shopName}</span>
            {crumbs.map((c, i) => (
              <span key={`${c.href}-${i}`} className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="text-slate-300">
                  /
                </span>
                {i === crumbs.length - 1 ? (
                  <span className="font-medium text-ink">{c.label}</span>
                ) : (
                  <Link href={c.href} className="hover:text-ink">
                    {c.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <form action="/products" method="get" className="relative hidden md:block" role="search">
            <label htmlFor="global-search" className="sr-only">
              Search products
            </label>
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            >
              <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              id="global-search"
              name="q"
              type="search"
              placeholder="Search products…"
              className="w-52 rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-sm outline-none ring-accent focus:bg-white focus:ring-2"
            />
          </form>

          <Link href="/inventory?status=LOW" className="btn btn-ghost" title="Stock alerts">
            <span className="sr-only">Stock alerts</span>
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
              <path d="M10 3.5 17 16H3L10 3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M10 8v4M10 14.25h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </Link>

          <AccountMenu user={user} logoutAction={logoutAction} />
        </div>
      </div>
    </header>
  );
}
