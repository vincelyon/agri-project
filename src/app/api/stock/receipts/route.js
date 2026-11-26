import { created, route } from "@/lib/api.js";
import { receiveStock } from "@/services/inventory.js";

export const POST = route(async ({ actor, body }) => created(await receiveStock(actor, body)));
