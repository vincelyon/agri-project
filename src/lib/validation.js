import { z } from "zod";
import { invalid } from "./errors.js";

/** Turn "" into undefined so optional fields can be left blank in forms. */
const emptyToUndefined = (v) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const optionalText = (max = 500) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max, `Must be at most ${max} characters`).optional());

const requiredText = (label, max = 200) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);

const positiveInt = (label) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: `${label} must be a number` })
      .int(`${label} must be a whole number`)
      .positive(`${label} must be greater than zero`)
      .max(1_000_000_000, `${label} is too large`),
  );

const nonNegativeInt = (label) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: `${label} must be a number` })
      .int(`${label} must be a whole number`)
      .min(0, `${label} cannot be negative`)
      .max(1_000_000_000, `${label} is too large`),
  );

const optionalMoney = (label) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: `${label} must be a number` })
      .min(0, `${label} cannot be negative`)
      .max(1_000_000_000_000, `${label} is too large`)
      .multipleOf(0.01, `${label} can have at most 2 decimal places`)
      .optional(),
  );

const idField = (label) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce.number({ error: `${label} is required` }).int().positive(`${label} is required`),
  );

const optionalId = z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional());

const dateField = (label) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce.date({ error: `${label} must be a valid date` }).optional(),
  );

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export const loginSchema = z.object({
  email: requiredText("Email").pipe(z.string().email("Enter a valid email address")),
  password: z.string({ error: "Password is required" }).min(1, "Password is required").max(200),
});

export const passwordSchema = z
  .string({ error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const userCreateSchema = z.object({
  name: requiredText("Name", 120),
  email: requiredText("Email", 200).pipe(z.string().email("Enter a valid email address")),
  role: z.enum(["ADMIN", "STAFF"], { error: "Choose a role" }),
  // Optional: when omitted the service auto-generates a temporary password.
  password: z.preprocess(emptyToUndefined, passwordSchema.optional()),
});

export const userUpdateSchema = z.object({
  name: requiredText("Name", 120).optional(),
  role: z.enum(["ADMIN", "STAFF"], { error: "Choose a role" }).optional(),
  isActive: z.boolean().optional(),
  password: z.preprocess(emptyToUndefined, passwordSchema.optional()),
});

export const categorySchema = z.object({
  name: requiredText("Name", 80),
  description: optionalText(300),
});

export const productSchema = z.object({
  sku: requiredText("SKU", 50).transform((s) => s.toUpperCase()),
  name: requiredText("Name", 160),
  categoryId: idField("Category"),
  unit: requiredText("Unit", 30),
  reorderLevel: nonNegativeInt("Reorder level"),
  buyingPrice: optionalMoney("Buying price"),
  sellingPrice: optionalMoney("Selling price"),
});

export const productCreateSchema = productSchema.extend({
  openingQuantity: z.preprocess(emptyToUndefined, nonNegativeInt("Opening quantity").optional()),
});

export const supplierSchema = z.object({
  name: requiredText("Name", 160),
  phone: optionalText(40),
  email: z.preprocess(emptyToUndefined, z.string().trim().email("Enter a valid email address").optional()),
  address: optionalText(300),
});

export const receiptSchema = z.object({
  productId: idField("Product"),
  quantity: positiveInt("Quantity"),
  supplierId: optionalId,
  occurredAt: dateField("Date"),
  unitCost: optionalMoney("Unit cost"),
  reference: optionalText(100),
  notes: optionalText(500),
});

export const issueSchema = z.object({
  productId: idField("Product"),
  quantity: positiveInt("Quantity"),
  issueType: z.enum(["SALE", "DISTRIBUTION", "INTERNAL_USE"], { error: "Choose an issue type" }),
  recipient: optionalText(160),
  occurredAt: dateField("Date"),
  reference: optionalText(100),
  notes: optionalText(500),
});

export const adjustmentSchema = z.object({
  productId: idField("Product"),
  direction: z.enum(["IN", "OUT"], { error: "Choose increase or decrease" }),
  quantity: positiveInt("Quantity"),
  reason: requiredText("Reason", 500),
  reference: optionalText(100),
});

export const reversalSchema = z.object({
  reason: requiredText("Reason", 500),
});

export const settingsSchema = z.object({
  shopName: requiredText("Shop name", 120),
  currency: z
    .string({ error: "Currency is required" })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code, e.g. ZMW"),
  units: z
    .string()
    .transform((s) =>
      s
        .split(/[\n,]/)
        .map((u) => u.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().max(30)).min(1, "Enter at least one unit").max(50)),
});

export const dateRangeSchema = z.object({
  from: dateField("From date"),
  to: dateField("To date"),
  productId: optionalId,
  type: z.preprocess(emptyToUndefined, z.enum(["IN", "OUT", "ADJUST_IN", "ADJUST_OUT"]).optional()),
});

/**
 * Parse input with a zod schema; throws a ServiceError carrying per-field
 * messages that forms can render next to the offending inputs.
 */
export function parseInput(schema, input) {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  const first = Object.values(fieldErrors)[0];
  throw invalid(first ?? "Please correct the highlighted fields.", fieldErrors);
}

/** Read a FormData into a plain object; unchecked checkboxes are simply absent. */
export function formDataToObject(formData) {
  const obj = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION")) continue; // Next.js internal fields
    obj[key] = typeof value === "string" ? value : undefined;
  }
  return obj;
}
