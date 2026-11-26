import { created, route } from "@/lib/api.js";
import { int, str } from "@/lib/query.js";
import { createProduct, listProducts } from "@/services/products.js";

export const GET = route(async ({ actor, query }) =>
  listProducts(actor, {
    search: str(query.get("q")),
    categoryId: int(query.get("category")),
    status: str(query.get("status")) ?? "active",
    page: int(query.get("page")) ?? 1,
  }),
);

export const POST = route(async ({ actor, body }) => created(await createProduct(actor, body)));
