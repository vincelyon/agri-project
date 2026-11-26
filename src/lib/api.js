import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth.js";
import { ServiceError } from "./errors.js";
import { isSameOrigin } from "./origin.js";

const STATUS_BY_CODE = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID: 422,
  RATE_LIMITED: 429,
};

/**
 * Route Handler wrapper: authenticates the caller, enforces same-origin on
 * mutations, parses JSON bodies, and maps service errors to HTTP statuses.
 * Authorization itself lives in the services, so API and UI share one rule set.
 */
export function route(handler) {
  return async (request, context) => {
    try {
      if (!isSameOrigin(request)) {
        return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
      }
      const actor = await getCurrentUser();
      if (!actor) {
        return NextResponse.json({ error: "Authentication required." }, { status: 401 });
      }
      const params = context?.params ? await context.params : {};
      const url = new URL(request.url);
      let body;
      if (!["GET", "HEAD"].includes(request.method)) {
        try {
          body = await request.json();
        } catch {
          return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
        }
      }
      const result = await handler({ actor, request, params, body, query: url.searchParams });
      if (result instanceof Response) return result;
      return NextResponse.json(result.body ?? result, { status: result.status ?? 200 });
    } catch (err) {
      if (err instanceof ServiceError) {
        return NextResponse.json(
          { error: err.message, code: err.code, fieldErrors: err.fieldErrors },
          { status: STATUS_BY_CODE[err.code] ?? 400 },
        );
      }
      console.error("API error:", err);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
  };
}

export const created = (body) => ({ body, status: 201 });

export const intParam = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};
