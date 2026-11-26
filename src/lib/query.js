/** Helpers for reading Next.js `searchParams` values safely. */
export const str = (v) => (Array.isArray(v) ? v[0] : v) || undefined;

export const int = (v) => {
  const n = Number(str(v));
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

export const page = (v) => int(v) ?? 1;
