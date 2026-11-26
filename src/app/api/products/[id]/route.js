import { route } from "@/lib/api.js";
import { notFound } from "@/lib/errors.js";
import { getProduct, setProductActive, updateProduct } from "@/services/products.js";
import { intParam } from "@/lib/api.js";

const idOf = (params) => {
  const id = intParam(params.id);
  if (!id) throw notFound("Product not found.");
  return id;
};

export const GET = route(async ({ actor, params }) => getProduct(actor, idOf(params)));

/** PATCH updates catalog fields; `{ "isActive": false }` alone archives/restores. */
export const PATCH = route(async ({ actor, params, body }) => {
  const id = idOf(params);
  if (body && Object.keys(body).length === 1 && typeof body.isActive === "boolean") {
    await setProductActive(actor, id, body.isActive);
    return getProduct(actor, id);
  }
  return updateProduct(actor, id, body);
});
