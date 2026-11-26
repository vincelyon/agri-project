import { prisma } from "@/lib/db.js";
import { assertCan } from "@/lib/permissions.js";

/**
 * Append an audit entry. Pass the transaction client so the entry commits (or
 * rolls back) together with the change it describes. The table is append-only
 * at the database level, so staff cannot edit it (M12).
 */
export async function writeAudit(db, { actorId, action, entityType, entityId, before, after }) {
  await db.auditLog.create({
    data: {
      actorId: actorId ?? null,
      action,
      entityType,
      entityId: entityId == null ? null : String(entityId),
      beforeJson: before === undefined ? undefined : toJson(before),
      afterJson: after === undefined ? undefined : toJson(after),
    },
  });
}

/** Make values (Decimal, Date, BigInt) safe for JSON columns. */
function toJson(value) {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
  );
}

export const AUDIT_PAGE_SIZE = 30;

export async function listAuditLogs(actor, { entityType, action, page = 1 } = {}) {
  assertCan(actor, "audit:read");
  const where = {};
  if (entityType) where.entityType = entityType;
  if (action) where.action = { contains: action, mode: "insensitive" };
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { id: "desc" },
      take: AUDIT_PAGE_SIZE,
      skip: (Math.max(1, page) - 1) * AUDIT_PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { rows, total, page, pageSize: AUDIT_PAGE_SIZE };
}

export async function listAuditEntityTypes(actor) {
  assertCan(actor, "audit:read");
  const rows = await prisma.auditLog.findMany({
    distinct: ["entityType"],
    select: { entityType: true },
    orderBy: { entityType: "asc" },
  });
  return rows.map((r) => r.entityType);
}
