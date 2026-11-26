import Link from "next/link";
import { MOVEMENT_LABELS, STATUS_LABELS } from "@/lib/stock.js";

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className = "", actions }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone = "default" }) {
  const tones = {
    default: "text-ink",
    warn: "text-amber-700",
    danger: "text-danger",
  };
  return (
    <div className="card">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Status is always conveyed by text + symbol, never colour alone. */
export function StatusBadge({ status }) {
  const styles = {
    OUT: "border-red-300 bg-red-50 text-red-800",
    LOW: "border-orange-300 bg-orange-50 text-orange-800",
    NORMAL: "border-green-300 bg-green-50 text-green-800",
  };
  const icons = { OUT: "✕", LOW: "▲", NORMAL: "●" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
      <span aria-hidden="true">{icons[status]}</span>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function ActiveBadge({ isActive }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
        isActive ? "border-green-300 bg-green-50 text-green-800" : "border-slate-300 bg-slate-100 text-slate-700"
      }`}
    >
      {isActive ? "Active" : "Archived"}
    </span>
  );
}

export function MovementBadge({ type }) {
  const styles = {
    IN: "border-green-300 bg-green-50 text-green-800",
    OUT: "border-blue-300 bg-blue-50 text-blue-800",
    ADJUST_IN: "border-amber-300 bg-amber-50 text-amber-800",
    ADJUST_OUT: "border-amber-300 bg-amber-50 text-amber-800",
  };
  const sign = type === "IN" || type === "ADJUST_IN" ? "+" : "−";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${styles[type]}`}>
      <span aria-hidden="true">{sign}</span>
      {MOVEMENT_LABELS[type]}
    </span>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <p className="font-medium text-slate-800">{title}</p>
      {children && <p className="mt-1 text-sm text-slate-600">{children}</p>}
    </div>
  );
}

function buildHref(basePath, params, page) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, String(v));
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({ basePath, params = {}, page, pageSize, total }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
      <span className="text-slate-600">
        Page {page} of {pages} · {total} records
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link className="btn btn-secondary btn-sm" href={buildHref(basePath, params, page - 1)}>
            ← Previous
          </Link>
        ) : (
          <span className="btn btn-secondary btn-sm opacity-50" aria-disabled="true">
            ← Previous
          </span>
        )}
        {page < pages ? (
          <Link className="btn btn-secondary btn-sm" href={buildHref(basePath, params, page + 1)}>
            Next →
          </Link>
        ) : (
          <span className="btn btn-secondary btn-sm opacity-50" aria-disabled="true">
            Next →
          </span>
        )}
      </div>
    </nav>
  );
}

/** GET form for search/filter bars; works without JavaScript. */
export function FilterBar({ children, action }) {
  return (
    <form action={action} method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
      {children}
      <button type="submit" className="btn btn-secondary">
        Apply
      </button>
      <Link href={action} className="btn btn-secondary">
        Reset
      </Link>
    </form>
  );
}

export function FilterField({ label, name, defaultValue, type = "text", children, placeholder }) {
  return (
    <div className="min-w-40 flex-1">
      <label htmlFor={`f-${name}`} className="label">
        {label}
      </label>
      {children ? (
        <select id={`f-${name}`} name={name} defaultValue={defaultValue ?? ""} className="input">
          {children}
        </select>
      ) : (
        <input id={`f-${name}`} name={name} type={type} defaultValue={defaultValue ?? ""} placeholder={placeholder} className="input" />
      )}
    </div>
  );
}
