"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withActor } from "@/lib/action.js";
import { formDataToObject } from "@/lib/validation.js";
import { createUser, resetUserPassword, updateUser } from "@/services/users.js";
import { updateSettings } from "@/services/settings.js";

export async function createUserAction(_prev, formData) {
  return withActor(formData, async (actor) => {
    const u = await createUser(actor, formDataToObject(formData));
    revalidatePath("/users");
    return {
      message: `User ${u.email} created.`,
      data: { email: u.email, temporaryPassword: u.temporaryPassword },
    };
  });
}

export async function resetUserPasswordAction(_prev, formData) {
  return withActor(formData, async (actor) => {
    const id = Number(formData.get("id"));
    const { temporaryPassword } = await resetUserPassword(actor, id);
    revalidatePath("/users");
    return {
      message: "Temporary password generated.",
      data: { temporaryPassword },
    };
  });
}

export async function updateUserAction(_prev, formData) {
  const result = await withActor(formData, async (actor) => {
    const input = formDataToObject(formData);
    await updateUser(actor, Number(input.id), {
      name: input.name,
      role: input.role,
      isActive: input.isActive === "on",
      password: input.password,
    });
    revalidatePath("/users");
    return { message: "User updated." };
  });
  if (result.ok) redirect("/users");
  return result;
}

export async function toggleUserActiveAction(_prev, formData) {
  return withActor(null, async (actor) => {
    await updateUser(actor, Number(formData.get("id")), { isActive: formData.get("isActive") === "true" });
    revalidatePath("/users");
    return { message: "User updated." };
  });
}

export async function updateSettingsAction(_prev, formData) {
  const result = await withActor(formData, async (actor) => {
    await updateSettings(actor, formDataToObject(formData));
    revalidatePath("/", "layout");
    revalidatePath("/settings");
    return { message: "Settings saved." };
  });
  if (result.ok) redirect("/settings");
  return result;
}
