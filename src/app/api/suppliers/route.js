import { created, route } from "@/lib/api.js";
import { str } from "@/lib/query.js";
import { createSupplier, listSuppliers } from "@/services/suppliers.js";

export const GET = route(async ({ actor, query }) => ({
  rows: await listSuppliers(actor, {
    includeArchived: query.get("includeArchived") === "true",
    search: str(query.get("q")),
  }),
}));

export const POST = route(async ({ actor, body }) => created(await createSupplier(actor, body)));
