import { created, route } from "@/lib/api.js";
import { adjustStock } from "@/services/inventory.js";

export const POST = route(async ({ actor, body }) => created(await adjustStock(actor, body)));
