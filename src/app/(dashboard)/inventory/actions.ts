"use server";

import { assertPermission } from "@/lib/authorization";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  productSchema,
  batchSchema,
  batchPriceUpdateSchema,
} from "@/lib/validations/inventory";
import { MovementType, UnitType } from "@prisma/client";
import { postStockAdjustment } from "@/lib/accounting/posting-service";

type ActionState = { error: string } | null;
type InventoryTx = import("@/lib/db").Transaction;

async function getCompanyId() {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;
  if (!companyId) throw new Error("Unauthorized");
  return companyId;
}

function normalizeFormData(formData: FormData) {
  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    raw[k] = v === "" ? undefined : v;
  }
  return raw;
}

function parseProductForm(formData: FormData) {
  const parsed = productSchema.safeParse(normalizeFormData(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Validation error");
  }

  return parsed.data;
}

// ── Products ──────────────────────────────────────────────────────────────────

export async function createProduct(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertPermission("MASTER_CREATE");
  let companyId: string;
  try {
    companyId = await getCompanyId();
  } catch {
    return { error: "Not authenticated" };
  }

  let parsed: ReturnType<typeof parseProductForm>;
  try {
    parsed = parseProductForm(formData);
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Validation error" };
  }

  if (
    parsed.supplierId &&
    !(await db.supplier.findFirst({
      where: { id: parsed.supplierId, companyId },
    }))
  )
    return { error: "Mill not found" };
  if (
    parsed.categoryId &&
    !(await db.category.findFirst({
      where: { id: parsed.categoryId, companyId },
    }))
  )
    return { error: "Category not found" };
  const { unit, subUnit, ...rest } = parsed;

  try {
    await db.product.create({
      data: {
        companyId,
        ...rest,
        unit: unit as UnitType,
        subUnit: subUnit ? (subUnit as UnitType) : undefined,
      },
    });
  } catch (e: unknown) {
    return {
      error: e instanceof Error ? e.message : "Failed to create product",
    };
  }

  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function updateProduct(
  id: string,
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertPermission("MASTER_EDIT");
  let companyId: string;
  try {
    companyId = await getCompanyId();
  } catch {
    return { error: "Not authenticated" };
  }

  let parsed: ReturnType<typeof parseProductForm>;
  try {
    parsed = parseProductForm(formData);
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Validation error" };
  }

  const current = await db.product.findFirst({
    where: { id, companyId },
    select: { unit: true },
  });
  if (!current) return { error: "Product not found" };
  if (parsed.unit !== current.unit)
    return {
      error:
        "A product's stock unit cannot be changed. Create a separate BAG or KG product instead; quantities and rates are not automatically converted.",
    };

  if (
    parsed.supplierId &&
    !(await db.supplier.findFirst({
      where: { id: parsed.supplierId, companyId },
    }))
  )
    return { error: "Mill not found" };
  if (
    parsed.categoryId &&
    !(await db.category.findFirst({
      where: { id: parsed.categoryId, companyId },
    }))
  )
    return { error: "Category not found" };
  const { unit, subUnit, ...rest } = parsed;

  try {
    await db.product.updateMany({
      where: { id, companyId },
      data: {
        ...rest,
        unit: unit as UnitType,
        subUnit: subUnit ? (subUnit as UnitType) : null,
      },
    });
  } catch (e: unknown) {
    return {
      error: e instanceof Error ? e.message : "Failed to update product",
    };
  }

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
  redirect(`/inventory/${id}`);
}

export async function deleteProduct(id: string): Promise<void> {
  await assertPermission("MASTER_DELETE");
  const companyId = await getCompanyId();
  await db.product.updateMany({
    where: { id, companyId },
    data: { isActive: false },
  });
  revalidatePath("/inventory");
  redirect("/inventory");
}

// ── Batches ───────────────────────────────────────────────────────────────────

export async function createBatch(
  productId: string,
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertPermission("OPENING_BALANCE_CORRECT");
  let companyId: string;
  try {
    companyId = await getCompanyId();
  } catch {
    return { error: "Not authenticated" };
  }

  // Verify the product belongs to this company
  const product = await db.product.findFirst({
    where: { id: productId, companyId },
  });
  if (!product) return { error: "Product not found" };

  const parsed = batchSchema.safeParse(normalizeFormData(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  const {
    batchNumber,
    manufactureDate,
    expiryDate,
    purchasePrice,
    salePrice,
    quantity,
  } = parsed.data;

  // Check for duplicate batch number on same product
  const existing = await db.productBatch.findFirst({
    where: { batchNumber, productId, companyId },
  });
  if (existing)
    return {
      error: `Batch number "${batchNumber}" already exists for this product`,
    };

  try {
    await db.$transaction(async (tx: InventoryTx) => {
      const batch = await tx.productBatch.create({
        data: {
          companyId,
          productId,
          batchNumber,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          manufactureDate: manufactureDate ? new Date(manufactureDate) : null,
          purchasePrice,
          salePrice,
          quantity,
          initialQuantity: quantity,
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          companyId,
          productId,
          batchId: batch.id,
          type: MovementType.PURCHASE,
          quantity,
          reference: `BATCH:${batchNumber}`,
          notes: "Opening stock entered",
        },
      });
      await postStockAdjustment(tx, {
        companyId,
        sourceId: movement.id,
        number: `OPEN-${batchNumber}`,
        date: movement.createdAt,
        amount: new (await import("decimal.js")).default(quantity)
          .times(purchasePrice)
          .toFixed(2),
        opening: true,
        increase: true,
      });
    });
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Failed to add batch" };
  }

  revalidatePath(`/inventory/${productId}`);
  revalidatePath("/inventory");
  return null;
}

export async function updateBatchPrice(
  productId: string,
  batchId: string,
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertPermission("MASTER_EDIT");
  let companyId: string;
  try {
    companyId = await getCompanyId();
  } catch {
    return { error: "Not authenticated" };
  }

  const parsed = batchPriceUpdateSchema.safeParse(normalizeFormData(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  const batch = await db.productBatch.findFirst({
    where: { id: batchId, productId, companyId },
  });
  if (!batch) return { error: "Batch not found" };

  if (Number(batch.purchasePrice) !== parsed.data.purchasePrice)
    return {
      error:
        "A received lot’s cost is fixed for accounting. Reverse and re-enter the receipt to correct its cost.",
    };

  await db.productBatch.update({
    where: { id: batchId },
    data: {
      purchasePrice: parsed.data.purchasePrice,
      salePrice: parsed.data.salePrice,
    },
  });

  revalidatePath(`/inventory/${productId}`);
  revalidatePath("/inventory");
  return null;
}

export async function adjustStock(
  productId: string,
  batchId: string,
  delta: number,
  notes: string,
): Promise<void> {
  const form = new FormData();
  form.set("productId", productId);
  form.set("batchId", batchId);
  form.set("direction", delta > 0 ? "add" : "subtract");
  form.set("quantity", String(Math.abs(delta)));
  form.set("notes", notes);
  const { createStockAdjustment } = await import("./adjustments/actions");
  const result = await createStockAdjustment(null, form);
  if (result?.error) throw new Error(result.error);
}
