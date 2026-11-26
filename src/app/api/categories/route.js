import { created, route } from "@/lib/api.js";
import { createCategory, listCategories } from "@/services/categories.js";

export const GET = route(async ({ actor, query }) => ({
  rows: await listCategories(actor, { includeArchived: query.get("includeArchived") === "true" }),
}));

export const POST = route(async ({ actor, body }) => created(await createCategory(actor, body)));
