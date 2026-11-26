import { forbidden, unauthenticated } from "./errors.js";

export const ROLES = { ADMIN: "ADMIN", STAFF: "STAFF" };

/**
 * Permission -> roles allowed. Every service mutation and sensitive read calls
 * `assertCan` so the rules are enforced on the server, never only in the UI.
 */
export const PERMISSIONS = {
  "catalog:read": ["ADMIN", "STAFF"],
  "catalog:write": ["ADMIN"],
  "inventory:read": ["ADMIN", "STAFF"],
  "stock:receive": ["ADMIN", "STAFF"],
  "stock:issue": ["ADMIN", "STAFF"],
  "stock:adjust": ["ADMIN"],
  "stock:reverse": ["ADMIN"],
  "history:read": ["ADMIN", "STAFF"],
  "reports:read": ["ADMIN"], // staff access is opt-in via the staffCanViewReports setting
  "users:manage": ["ADMIN"],
  "audit:read": ["ADMIN"],
  "settings:manage": ["ADMIN"],
};

export function can(user, permission) {
  if (!user || !user.isActive) return false;
  return (PERMISSIONS[permission] ?? []).includes(user.role);
}

export function assertCan(user, permission) {
  if (!user || !user.isActive) throw unauthenticated();
  if (!can(user, permission)) throw forbidden();
}
