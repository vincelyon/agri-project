import { created, route } from "@/lib/api.js";
import { issueStock } from "@/services/inventory.js";

export const POST = route(async ({ actor, body }) => created(await issueStock(actor, body)));
