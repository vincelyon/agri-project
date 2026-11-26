/**
 * Data table shell ported from the Pest Risk Register (`<.data_table>` /
 * `.sa-data-table`): card chrome, horizontal scroll, solid brand header,
 * zebra rows, and amber inset hover accent.
 */

export function DataTable({
  id,
  children,
  toolbar,
  footer,
  minWidth = "800px",
  className = "",
  tableClassName = "",
  staticRows = false,
}) {
  return (
    <div
      id={id}
      className={`relative w-full rounded-2xl border border-stone-200/90 bg-white shadow-lg ring-1 ring-stone-900/5 ${className}`}
    >
      {toolbar && <div className="bg-stone-50 px-4 py-3 sm:px-6">{toolbar}</div>}
      <div className={`min-w-0 overflow-hidden ${footer ? "" : "rounded-b-2xl"}`}>
        <div className="sa-data-table-scroll overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
          <table
            className={`sa-data-table w-full border-separate border-spacing-0 text-left ${
              staticRows ? "sa-data-table--static" : ""
            } ${footer ? "sa-data-table--with-footer" : ""} ${tableClassName}`}
            style={{ minWidth }}
          >
            {children}
          </table>
        </div>
      </div>
      {footer && <div className="border-t border-stone-200 bg-stone-50 px-4 py-4 sm:px-6">{footer}</div>}
    </div>
  );
}

export function TableToolbar({ eyebrow, title, actions }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</p>
        )}
        {title && <p className="text-sm font-bold text-brand-900">{title}</p>}
      </div>
      {actions}
    </div>
  );
}

export function TableTh({ children, className = "", shortLabel }) {
  return (
    <th className={`px-4 py-3.5 text-left sm:px-5 sm:py-4 ${className}`}>
      <div className="flex items-center gap-2.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/95">
          {shortLabel ? (
            <>
              <span className="hidden sm:inline">{children}</span>
              <span className="sm:hidden">{shortLabel}</span>
            </>
          ) : (
            children
          )}
        </span>
      </div>
    </th>
  );
}

export function TableTd({ children, className = "" }) {
  return <td className={`px-4 py-3.5 align-middle sm:px-5 sm:py-4 ${className}`}>{children}</td>;
}

export function TableNameCell({ name, subtitle, tone = "warning" }) {
  const dot = {
    success: "bg-good",
    warning: "bg-warn",
    danger: "bg-danger",
    info: "bg-accent",
    neutral: "bg-slate-400",
  }[tone];

  return (
    <div className="flex items-start gap-3">
      <span className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full shadow-sm ring-2 ring-white ${dot}`} />
      <div className="min-w-0 flex-1">
        <span className="text-sm font-semibold leading-snug text-brand-900 transition-colors duration-200 group-hover/row:text-brand-600">
          {name}
        </span>
        {subtitle && <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>}
      </div>
    </div>
  );
}

export function TableDatePill({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100/90 px-2.5 py-1 text-sm font-medium tabular-nums text-brand-900 ring-1 ring-stone-200/80">
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true">
        <rect x="3.5" y="4.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3.5 8.5h13M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {children}
    </span>
  );
}

export function TableStatusPill({ label, tone = "neutral" }) {
  const wrap = {
    success: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    warning: "bg-amber-100 text-amber-700 ring-amber-200",
    danger: "bg-red-100 text-red-700 ring-red-200",
    info: "bg-sky-100 text-sky-700 ring-sky-200",
    neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  }[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 sm:text-xs ${wrap}`}
    >
      {label}
    </span>
  );
}

export function TableEmpty({ title = "No data", children }) {
  return (
    <div className="rounded-xl border-2 border-brand-900 bg-white p-8 text-center shadow-lg">
      <h3 className="mb-2 text-xl font-semibold text-brand-900">{title}</h3>
      {children && <div className="text-sm text-brand-900/80">{children}</div>}
    </div>
  );
}
