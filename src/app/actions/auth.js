"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth.js";
import { toActionError } from "@/lib/errors.js";
import { withActor } from "@/lib/action.js";
import { formDataToObject } from "@/lib/validation.js";
import { authenticate, changeOwnPassword, recordLogout } from "@/services/auth.js";

export async function loginAction(_prev, formData) {
  let user;
  try {
    user = await authenticate(formDataToObject(formData));
    await createSession(user.id);
  } catch (err) {
    const state = toActionError(err);
    state.values = { email: String(formData.get("email") ?? "") };
    return state;
  }
  redirect(user.mustChangePassword ? "/change-password" : "/dashboard");
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) await recordLogout(user);
  await destroySession();
  redirect("/login");
}

export async function changePasswordAction(_prev, formData) {
  const result = await withActor(formData, async (actor) => {
    await changeOwnPassword(actor, formDataToObject(formData));
    return { message: "Password changed." };
  });
  if (result.ok) redirect("/dashboard");
  return result;
}
