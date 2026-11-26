"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withActor } from "@/lib/action.js";
import { formDataToObject } from "@/lib/validation.js";
import { adjustStock, issueStock, receiveStock, reverseMovement } from "@/services/inventory.js";

function refresh() {
  for (const p of ["/dashboard", "/inventory", "/products", "/stock/in", "/stock/out", "/stock/adjust", "/stock/history", "/reports"]) {
    revalidatePath(p);
  }
}

export async function receiveStockAction(_prev, formData) {
  const result = await withActor(formData, async (actor) => {
    const r = await receiveStock(actor, formDataToObject(formData));
    refresh();
    return { message: `Receipt recorded. New balance: ${r.balanceAfter}.` };
  });
  if (result.ok) redirect("/stock/in");
  return result;
}

export async function issueStockAction(_prev, formData) {
  const result = await withActor(formData, async (actor) => {
    const r = await issueStock(actor, formDataToObject(formData));
    refresh();
    return { message: `Issue recorded. New balance: ${r.balanceAfter}.` };
  });
  if (result.ok) redirect("/stock/out");
  return result;
}

export async function adjustStockAction(_prev, formData) {
  const result = await withActor(formData, async (actor) => {
    const r = await adjustStock(actor, formDataToObject(formData));
    refresh();
    return { message: `Adjustment recorded. New balance: ${r.balanceAfter}.` };
  });
  if (result.ok) redirect("/stock/adjust");
  return result;
}

export async function reverseMovementAction(_prev, formData) {
  return withActor(formData, async (actor) => {
    const r = await reverseMovement(actor, Number(formData.get("movementId")), formDataToObject(formData));
    refresh();
    return { message: `Movement reversed. New balance: ${r.balanceAfter}.` };
  });
}
