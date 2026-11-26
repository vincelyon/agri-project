import Link from "next/link";
import { requireUser } from "@/lib/auth.js";
import { formatMoney, formatNumber } from "@/lib/format.js";
import { getDashboard } from "@/services/inventory.js";
import { getSettings } from "@/services/settings.js";
import { KpiCard } from "@/components/dashboard/widgets.jsx";
import {
  DataTable,
  TableEmpty,
  TableNameCell,
  TableStatusPill,
  TableTd,
  TableTh,
  TableToolbar,
} from "@/components/tables/DataTable.jsx";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [d, settings] = await Promise.all([getDashboard(user), getSettings()]);
  const alerts = d.alerts.slice(0, 6);

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-900 sm:text-3xl">
            Welcome back, {user.name}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Stock value {formatMoney(d.stockValue, settings.currency)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/stock/in" className="btn btn-secondary btn-sm">
            Record receipt
          </Link>
          <Link href="/stock/out" className="btn btn-primary btn-sm">
            Record issue
          </Link>
        </div>
      </div>

      <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
        {d.kpis.map((k) => (
          <KpiCard
            key={k.key}
            label={k.label}
            value={formatNumber(k.value)}
            change={k.change}
            changeLabel={k.changeLabel}
            spark={k.spark}
            tone={k.tone}
            invertChange={k.key === "low" || k.key === "out"}
            href={k.href}
          />
        ))}
      </div>

      {alerts.length === 0 ? (
        <TableEmpty title="All stock looks healthy">Every active product is above its reorder level.</TableEmpty>
      ) : (
        <DataTable
          id="needs-attention-table"
          minWidth="720px"
          toolbar={
            <TableToolbar
              eyebrow="Monitoring"
              title="Needs attention"
              actions={
                <Link href="/inventory?status=LOW" className="text-sm font-semibold text-brand-700 hover:underline">
                  Open inventory →
                </Link>
              }
            />
          }
        >
          <thead>
            <tr>
              <TableTh>Product</TableTh>
              <TableTh shortLabel="Cat.">Category</TableTh>
              <TableTh>On hand</TableTh>
              <TableTh shortLabel="Reorder">Reorder level</TableTh>
              <TableTh>Status</TableTh>
            </tr>
          </thead>
          <tbody>
            {alerts.map((row, i) => (
              <tr key={row.id} className="group/row" style={{ animationDelay: `${Math.min(i * 48, 720)}ms` }}>
                <TableTd>
                  <TableNameCell
                    name={row.name}
                    subtitle={row.sku}
                    tone={row.status === "OUT" ? "danger" : "warning"}
                  />
                </TableTd>
                <TableTd>
                  <span className="text-sm text-stone-600">{row.categoryName}</span>
                </TableTd>
                <TableTd>
                  <span className="text-sm font-semibold tabular-nums text-brand-900">
                    {formatNumber(row.onHand)} <span className="font-medium text-stone-500">{row.unit}</span>
                  </span>
                </TableTd>
                <TableTd>
                  <span className="text-sm tabular-nums text-stone-600">{formatNumber(row.reorderLevel)}</span>
                </TableTd>
                <TableTd>
                  <TableStatusPill
                    label={row.status === "OUT" ? "Out of stock" : "Low stock"}
                    tone={row.status === "OUT" ? "danger" : "warning"}
                  />
                </TableTd>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}
