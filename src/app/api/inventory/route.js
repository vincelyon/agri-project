import { route } from "@/lib/api.js";
import { int, str } from "@/lib/query.js";
import { listInventory } from "@/services/inventory.js";

export const GET = route(async ({ actor, query }) => ({
  rows: await listInventory(actor, {
    search: str(query.get("q")),
    categoryId: int(query.get("category")),
    status: ["OUT", "LOW", "NORMAL"].includes(str(query.get("status"))) ? str(query.get("status")) : undefined,
  }),
}));
