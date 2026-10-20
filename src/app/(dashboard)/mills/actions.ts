"use server";
import { db } from "@/lib/db";
import { getActiveSession } from "@/lib/session";
import { allocateDocumentNumber } from "@/lib/document-number";
import { postPurchase } from "@/lib/accounting/posting-service";
import { validQuantity } from "@/lib/quantities";
import { revalidatePath } from "next/cache";
export async function recordMill(
  _: { error?: string; ok?: boolean } | null,
  form: FormData,
) {
  const session = await getActiveSession();
  if (!session?.user || !["OWNER", "STOREKEEPER"].includes(session.user.role))
    return { error: "Forbidden" };
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Enter the mill name." };
  await db.supplier.create({
    data: {
      companyId: session.user.companyId,
      name,
      address: String(form.get("city") ?? "").trim(),
    },
  });
  revalidatePath("/mills");
  return { ok: true };
}
export async function receiveCloth(
  _: { error?: string; ok?: boolean } | null,
  form: FormData,
) {
  const session = await getActiveSession();
  if (!session?.user || !["OWNER", "STOREKEEPER"].includes(session.user.role))
    return { error: "Forbidden" };
  const { companyId, id: userId } = session.user;
  const supplierId = String(form.get("supplierId") ?? ""),
    productId = String(form.get("productId") ?? ""),
    lot = String(form.get("lot") ?? "").trim(),
    quantity = Number(form.get("quantity"));
  if (!validQuantity(quantity) || !lot)
    return {
      error:
        "Enter a lot number and a positive quantity, up to 3 decimal places.",
    };
  const [supplier, product] = await Promise.all([
    db.supplier.findFirst({ where: { id: supplierId, companyId } }),
    db.product.findFirst({
      where: { id: productId, companyId, isActive: true },
    }),
  ]);
  if (!supplier || !product)
    return { error: "Select a mill and a product from this company." };
  await db.$transaction(async (tx) => {
    const date = new Date(),
      number = await allocateDocumentNumber(
        tx,
        companyId,
        "PURCHASE_ORDER",
        date,
      );
    await tx.purchaseOrder.create({
      data: {
        companyId,
        userId,
        supplierId,
        poNumber: number,
        orderDate: date,
        status: "DRAFT",
        totalAmount: 0,
        netAmount: 0,
        notes: JSON.stringify({
          kind: "unpriced-receipt",
          lot,
          detail: String(form.get("detail") ?? "").slice(0, 500),
        }),
        items: {
          create: { productId, quantity, purchasePrice: 0, totalAmount: 0 },
        },
      },
    });
  });
  revalidatePath("/mills");
  revalidatePath("/godown");
  revalidatePath("/receipts");
  return { ok: true };
}
export async function priceReceipt(
  _: { error?: string; ok?: boolean } | null,
  form: FormData,
) {
  const session = await getActiveSession();
  if (!session?.user || !["OWNER", "ACCOUNTANT"].includes(session.user.role))
    return { error: "Forbidden" };
  const { companyId, id: userId } = session.user;
  const id = String(form.get("id") ?? ""),
    rate = Number(form.get("rate")),
    saleRate = Number(form.get("saleRate"));
  if (
    !Number.isFinite(rate) ||
    rate <= 0 ||
    !Number.isFinite(saleRate) ||
    saleRate <= 0
  )
    return { error: "Enter positive cost and selling rates." };
  try {
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "PurchaseOrder" WHERE id = ${id} AND "companyId" = ${companyId} FOR UPDATE`;
      const receipt = await tx.purchaseOrder.findFirst({
        where: { id, companyId, status: "DRAFT" },
        include: { items: true },
      });
      if (!receipt || receipt.items.length !== 1)
        throw new Error("Receipt not found or already priced");
      const meta = JSON.parse(receipt.notes ?? "{}") as {
        kind?: string;
        lot?: string;
        detail?: string;
      };
      if (meta.kind !== "unpriced-receipt" || !meta.lot)
        throw new Error("This is not an unpriced receipt");
      const item = receipt.items[0];
      const amount = new (await import("decimal.js")).default(item.quantity)
        .times(rate)
        .toFixed(2);
      const batch = await tx.productBatch.create({
        data: {
          companyId,
          productId: item.productId,
          batchNumber: meta.lot,
          purchasePrice: rate,
          salePrice: saleRate,
          quantity: item.quantity,
          initialQuantity: item.quantity,
        },
      });
      await tx.purchaseOrderItem.update({
        where: { id: item.id },
        data: { batchId: batch.id, purchasePrice: rate, totalAmount: amount },
      });
      await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: "POSTED",
          totalAmount: amount,
          netAmount: amount,
          notes: `Lot ${meta.lot}${meta.detail ? " · " + meta.detail : ""}`,
        },
      });
      await tx.stockMovement.create({
        data: {
          companyId,
          productId: item.productId,
          batchId: batch.id,
          type: "PURCHASE",
          quantity: item.quantity,
          sourceType: "PURCHASE",
          sourceId: id,
          reference: receipt.poNumber,
        },
      });
      await postPurchase(tx, {
        companyId,
        sourceId: id,
        number: receipt.poNumber,
        date: receipt.orderDate,
        amount,
      });
      await tx.auditLog.create({
        data: {
          companyId,
          userId,
          userName: session.user.name,
          action: "POST",
          entity: "PurchaseOrder",
          entityId: id,
          detail: "Unpriced godown receipt approved",
        },
      });
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not price receipt",
    };
  }
  revalidatePath("/receipts");
  revalidatePath("/godown");
  revalidatePath("/purchases");
  return { ok: true };
}
