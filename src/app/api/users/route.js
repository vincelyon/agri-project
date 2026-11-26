import { created, route } from "@/lib/api.js";
import { createUser, listUsers } from "@/services/users.js";

export const GET = route(async ({ actor }) => ({ rows: await listUsers(actor) }));
export const POST = route(async ({ actor, body }) => created(await createUser(actor, body)));
