"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withActor } from "@/lib/action.js";
import { formDataToObject } from "@/lib/validation.js";
import { createCategory, setCategoryActive, updateCategory } from "@/services/categories.js";
import { createProduct, setProductActive, updateProduct } from "@/services/products.js";
import { createSupplier, setSupplierActive, updateSupplier } from "@/services/suppliers.js";

const id = (formData, key = "id") => Number(formData.get(key));

/* Categories */
export async function createCategoryAction(_prev, formData) {
  const result = await withActor(formData, async (actor) => {
    const c = await createCategory(actor, formDataToObject(formData));
    revalidatePath("/categories");
    return { message: `Category “${c.name}” created.` };
  });
  if (result.ok) redirect("/categories");
  return result;
}

export async function updateCategoryAction(_prev, formData) {
  const result = await withActor(formData, async (actor) => {
    const c = await updateCategory(actor, id(formData), formDataToObject(formData));
    revalidatePath("/categories");
    return { message: `Category “${c.name}” updated.` };
  });
  if (result.ok) redirect("/categories");
  return result;
}

export async function setCategoryActiveAction(_prev, formData) {
  return withActor(null, async (actor) => {
    await setCategoryActive(actor, id(formData), formData.get("isActive") === "true");
    revalidatePath("/categories");
    return { message: "Category updated." };
  });
}

/* Suppliers */
export async function createSupplierAction(_prev, formData) {
  const result = await withActor(formData, async (actor) => {
    const s = await createSupplier(actor, formDataToObject(formData));
    revalidatePath("/suppliers");
    return { message: `Supplier “${s.name}” created.` };
  });
  if (result.ok) redirect("/suppliers");
  return result;
}

export async function updateSupplierAction(_prev, formData) {
  const result = await withActor(formData, async (actor) => {
    const s = await updateSupplier(actor, id(formData), formDataToObject(formData));
    revalidatePath("/suppliers");
    return { message: `Supplier “${s.name}” updated.` };
  });
  if (result.ok) redirect("/suppliers");
  return result;
}

export async function setSupplierActiveAction(_prev, formData) {
  return withActor(null, async (actor) => {
    await setSupplierActive(actor, id(formData), formData.get("isActive") === "true");
    revalidatePath("/suppliers");
    return { message: "Supplier updated." };
  });
}

/* Products */
export async function createProductAction(_prev, formData) {
  const result = await withActor(formData, async (actor) => {
    const p = await createProduct(actor, formDataToObject(formData));
    revalidatePath("/products");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { message: `Product “${p.name}” created.` };
  });
  if (result.ok) redirect("/products");
  return result;
}

export async function updateProductAction(_prev, formData) {
  const result = await withActor(formData, async (actor) => {
    const p = await updateProduct(actor, id(formData), formDataToObject(formData));
    revalidatePath("/products");
    revalidatePath("/inventory");
    return { message: `Product “${p.name}” updated.` };
  });
  if (result.ok) redirect("/products");
  return result;
}

export async function setProductActiveAction(_prev, formData) {
  return withActor(null, async (actor) => {
    await setProductActive(actor, id(formData), formData.get("isActive") === "true");
    revalidatePath("/products");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { message: "Product updated." };
  });
}
