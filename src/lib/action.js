import { getCurrentUser } from "./auth.js";
import { toActionError, unauthenticated } from "./errors.js";
import { formDataToObject } from "./validation.js";

/**
 * Wrap a Server Action body: resolves the signed-in actor, runs the service
 * call, and converts failures into a safe state object for useActionState.
 * On failure the submitted values are echoed back so the form can refill
 * (React resets uncontrolled forms after an action completes).
 *
 * `fn(actor)` should return `{ message }` and may call revalidatePath.
 * Redirects must be done by the caller *after* this returns (redirect throws).
 */
export async function withActor(formData, fn) {
  try {
    const actor = await getCurrentUser();
    if (!actor) throw unauthenticated();
    const result = (await fn(actor)) ?? {};
    return { ok: true, message: result.message ?? "Saved.", data: result.data };
  } catch (err) {
    const state = toActionError(err);
    if (formData) {
      const values = formDataToObject(formData);
      delete values.password;
      delete values.currentPassword;
      delete values.newPassword;
      delete values.confirmPassword;
      state.values = values;
    }
    return state;
  }
}
