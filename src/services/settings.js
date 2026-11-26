import { prisma } from "@/lib/db.js";
import { assertCan } from "@/lib/permissions.js";
import { parseInput, settingsSchema } from "@/lib/validation.js";
import { writeAudit } from "./audit.js";

export const DEFAULT_SETTINGS = {
  shopName: "Agri-Input Stock Manager",
  currency: "ZMW",
  units: ["bag", "kg", "litre", "packet", "piece", "box"],
  staffCanViewReports: false,
};

/** Settings are readable by any caller (they drive labels); merged over defaults. */
export async function getSettings(db = prisma) {
  const rows = await db.setting.findMany();
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key in DEFAULT_SETTINGS) settings[row.key] = row.valueJson;
  }
  return settings;
}

export async function updateSettings(actor, input) {
  assertCan(actor, "settings:manage");
  const data = parseInput(settingsSchema, input);
  return prisma.$transaction(async (tx) => {
    const before = await getSettings(tx);
    for (const [key, value] of Object.entries(data)) {
      await tx.setting.upsert({
        where: { key },
        create: { key, valueJson: value },
        update: { valueJson: value },
      });
    }
    await writeAudit(tx, {
      actorId: actor.id,
      action: "SETTINGS_UPDATED",
      entityType: "Setting",
      entityId: "app",
      before,
      after: data,
    });
    return data;
  });
}
