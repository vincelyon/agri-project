/**
 * Error type thrown by the service layer. `code` is machine-readable, `message`
 * is safe to show to users, and `fieldErrors` maps form fields to messages.
 */
export class ServiceError extends Error {
  constructor(code, message, fieldErrors = undefined) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export const unauthenticated = (msg = "You must sign in to continue.") =>
  new ServiceError("UNAUTHENTICATED", msg);
export const forbidden = (msg = "You do not have permission to do that.") =>
  new ServiceError("FORBIDDEN", msg);
export const notFound = (msg = "Record not found.") => new ServiceError("NOT_FOUND", msg);
export const conflict = (msg, fieldErrors) => new ServiceError("CONFLICT", msg, fieldErrors);
export const invalid = (msg, fieldErrors) => new ServiceError("INVALID", msg, fieldErrors);

/** Convert any thrown value into a safe { error, fieldErrors } payload. */
export function toActionError(err) {
  if (err instanceof ServiceError) {
    return { ok: false, error: err.message, fieldErrors: err.fieldErrors ?? {}, code: err.code };
  }
  // Never leak internals (SQL, stack traces) to the client.
  console.error("Unexpected error:", err);
  return {
    ok: false,
    error: "Something went wrong. Please try again.",
    fieldErrors: {},
    code: "INTERNAL",
  };
}
