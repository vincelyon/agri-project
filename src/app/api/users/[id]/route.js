import { intParam, route } from "@/lib/api.js";
import { notFound } from "@/lib/errors.js";
import { getUser, updateUser } from "@/services/users.js";

const idOf = (params) => {
  const id = intParam(params.id);
  if (!id) throw notFound("User not found.");
  return id;
};

export const GET = route(async ({ actor, params }) => getUser(actor, idOf(params)));
export const PATCH = route(async ({ actor, params, body }) => updateUser(actor, idOf(params), body));
