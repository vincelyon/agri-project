import Link from "next/link";
import { formatMoney, formatNumber } from "@/lib/format.js";
import { STATUS_LABELS } from "@/lib/stock.js";

/** Tiny SVG sparkline used on KPI cards. */
export function Sparkline({ values = [], tone = "default" }) {
  const width = 88;
  const height = 36;
  const pad = 2;
  if (!values.length) return null;
  const max = Math.max(...values.map(Math.abs), 1);
  const step = values.length === 1 ? width : (width - pad * 2) / (values.length - 1);
  const points = values.map((v, i) => {
    const x = pad + i * step;
    const y = height / 2 - (v / max) * ((height - pad * 2) / 2);
    return [x, y];
  });
  const polyline = points.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${pad},${height - pad} ${polyline} ${width - pad},${height - pad}`;
  const stroke = {
    default: "#2b6499",
    info: "#2563eb",
    warn: "#d97706",
    danger: "#dc2626",
    good: "#059669",
  }[tone];
  const fill = {
    default: "rgba(43,100,153,0.12)",
    info: "rgba(37,99,235,0.12)",
    warn: "rgba(217,119,6,0.14)",
    danger: "rgba(220,38,38,0.12)",
    good: "rgba(5,150,105,0.12)",
  }[tone];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-9 w-[88px]" aria-hidden="true">
      <polygon points={area} fill={fill} />
      <polyline points={polyline} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChangePill({ change, label = "vs last week", invert = false }) {
  const up = change > 0;
  const flat = change === 0;
  // For alert KPIs (low/out of stock), a drop is good and a rise is bad.
  const positive = invert ? !up : up;
  const tone = flat ? "text-muted bg-surface" : positive ? "text-good bg-good-soft" : "text-danger bg-danger-soft";
  const sign = flat ? "" : up ? "+" : "";
  return (
    <p className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      <span>
        {sign}
        {change}%
      </span>
      <span className="font-medium opacity-80">{label}</span>
    </p>
  );
}

export function KpiCard({ label, value, change, changeLabel, spark, tone = "default", invertChange = false, href }) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-ink">{value}</p>
          <ChangePill change={change ?? 0} label={changeLabel ?? "vs last week"} invert={invertChange} />
        </div>
        <Sparkline values={spark} tone={tone} />
      </div>
    </>
  );

  const className = "soft-panel block p-4 transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(16,24,40,0.08)]";
  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}

const BAR_COLORS = {
  slate: "bg-slate-700",
  amber: "bg-amber-400",
  rose: "bg-rose-500",
  blue: "bg-accent",
  green: "bg-good",
  orange: "bg-orange-400",
  yellow: "bg-yellow-400",
  brand: "bg-brand-600",
};

export function HorizontalBars({ title, rows, valueKey = "count", labelKey = "label", colorKey = "color", max }) {
  const peak = max ?? Math.max(...rows.map((r) => r[valueKey]), 1);
  return (
    <section className="soft-panel p-5">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => {
          const value = row[valueKey];
          const width = Math.max(2, Math.round((value / peak) * 100));
          return (
            <li key={row.key ?? row[labelKey]} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3 text-sm">
              <span className="truncate text-muted">{row[labelKey]}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={`h-full rounded-full ${BAR_COLORS[row[colorKey]] ?? BAR_COLORS.blue}`}
                  style={{ width: `${width}%` }}
                  role="presentation"
                />
              </div>
              <span className="text-right tabular-nums font-semibold text-ink">{formatNumber(value)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function MemberBars({ title, rows, currency }) {
  const peak = Math.max(...rows.map((r) => r.units), 1);
  const palette = ["blue", "green", "orange", "brand", "amber", "rose"];
  return (
    <section className="soft-panel p-5">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <ul className="mt-4 space-y-3">
        {rows.map((row, i) => {
          const width = Math.max(2, Math.round((row.units / peak) * 100));
          return (
            <li key={row.category} className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-sm">
              <span className="truncate font-medium text-ink">{row.category}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={`h-full rounded-full ${BAR_COLORS[palette[i % palette.length]]}`}
                  style={{ width: `${width}%` }}
                  role="presentation"
                />
              </div>
              <span className="whitespace-nowrap text-right text-xs text-muted">
                {formatNumber(row.units)} u · {formatMoney(row.value, currency)}
              </span>
            </li>
          );
        })}
        {rows.length === 0 && <li className="text-sm text-muted">No category data yet.</li>}
      </ul>
    </section>
  );
}

export function DueSoonList({ title, rows, actionHref, actionLabel }) {
  return (
    <section className="soft-panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line/70 px-5 py-4">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {actionHref && (
          <Link href={actionHref} className="text-sm font-medium text-accent hover:underline">
            {actionLabel}
          </Link>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted">Every active product is above its reorder level.</p>
      ) : (
        <ul className="divide-y divide-line/70">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{row.name}</p>
                <p className="text-xs text-muted">
                  {row.sku} · {formatNumber(row.onHand)} {row.unit} on hand · reorder at {formatNumber(row.reorderLevel)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  row.status === "OUT" ? "bg-danger-soft text-danger" : "bg-warn-soft text-amber-700"
                }`}
              >
                {row.status === "OUT" ? "Out of stock" : STATUS_LABELS[row.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function RecentMovementsCard({ rows, href }) {
  return (
    <section className="soft-panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line/70 px-5 py-4">
        <h2 className="text-sm font-semibold text-ink">Recent movements</h2>
        <Link href={href} className="text-sm font-medium text-accent hover:underline">
          Open history
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted">No stock movements yet.</p>
      ) : (
        <ul className="divide-y divide-line/70">
          {rows.slice(0, 6).map((m) => {
            const add = m.type === "IN" || m.type === "ADJUST_IN";
            return (
              <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{m.productName}</p>
                  <p className="text-xs text-muted">
                    {m.performedByName}
                    {m.reference ? ` · ${m.reference}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      add ? "bg-good-soft text-good" : "bg-accent-soft text-accent"
                    }`}
                  >
                    {add ? "+ Stock in" : "− Stock out"}
                  </span>
                  <p className="mt-1 text-sm tabular-nums text-ink">
                    {formatNumber(m.quantity)} {m.unit}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
