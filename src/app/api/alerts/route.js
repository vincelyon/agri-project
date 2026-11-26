import { route } from "@/lib/api.js";
import { listAlerts } from "@/services/inventory.js";

export const GET = route(async ({ actor }) => ({ rows: await listAlerts(actor) }));
