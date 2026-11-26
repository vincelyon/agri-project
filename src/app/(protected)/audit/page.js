import { requirePermission } from "@/lib/auth.js";
import { formatDateTime } from "@/lib/format.js";
import { page as pageParam, str } from "@/lib/query.js";
import { listAuditEntityTypes, listAuditLogs } from "@/services/audit.js";
import { EmptyState, FilterBar, FilterField, PageHeader, Pagination } from "@/components/ui/index.jsx";

export const metadata = { title: "Audit log" };

function Details({ before, after }) {
  if (!before && !after) return <span className="text-slate-400">—</span>;
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-brand-700 underline">View</summary>
      {before && (
        <pre className="mt-1 overflow-x-auto rounded bg-slate-50 p-2">
          <strong>Before:</strong> {JSON.stringify(before, null, 1)}
        </pre>
      )}
      {after && (
        <pre className="mt-1 overflow-x-auto rounded bg-slate-50 p-2">
          <strong>After:</strong> {JSON.stringify(after, null, 1)}
        </pre>
      )}
    </details>
  );
}

export default async function AuditPage({ searchParams }) {
  const admin = await requirePermission("audit:read");
  const sp = await searchParams;
  const filters = { entityType: str(sp.entity), action: str(sp.action) };
  const [log, entityTypes] = await Promise.all([
    listAuditLogs(admin, { ...filters, page: pageParam(sp.page) }),
    listAuditEntityTypes(admin),
  ]);

  return (
    <>
      <PageHeader title="Audit log" description="Append-only record of sign-ins, catalog changes, user changes and stock movements. It cannot be edited." />
      <FilterBar action="/audit">
        <FilterField label="Entity" name="entity" defaultValue={filters.entityType}>
          <option value="">All</option>
          {entityTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </FilterField>
        <FilterField label="Action contains" name="action" defaultValue={filters.action} placeholder="e.g. STOCK" />
      </FilterBar>
      {log.rows.length === 0 ? (
        <EmptyState title="No entries match" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">Audit log</caption>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Actor</th>
                <th scope="col">Event</th>
                <th scope="col">Entity</th>
                <th scope="col">Details</th>
              </tr>
            </thead>
            <tbody>
              {log.rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                  <td>{r.actor?.name ?? <span className="text-slate-500">System / unknown</span>}</td>
                  <td className="font-mono text-xs">{r.action}</td>
                  <td>
                    {r.entityType}
                    {r.entityId && <span className="text-slate-500"> #{r.entityId}</span>}
                  </td>
                  <td>
                    <Details before={r.beforeJson} after={r.afterJson} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination basePath="/audit" params={{ entity: filters.entityType, action: filters.action }} page={log.page} pageSize={log.pageSize} total={log.total} />
    </>
  );
}
