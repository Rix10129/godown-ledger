"use server";
import { db, type Transaction } from "@/lib/db";
import Decimal from "decimal.js";
import { rate as parseRate } from "@/lib/mars-workflows";
import { saveError } from "@/lib/save-error";
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
  const manufactureDate = String(form.get("manufactureDate") ?? "");
  const expiryDate = String(form.get("expiryDate") ?? "");
  if (
    [manufactureDate, expiryDate].some(
      (date) =>
        date &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(Date.parse(date))),
    )
  )
    return { error: "Enter valid batch dates." };
  const productName = String(form.get("productName") ?? "").trim();
  const isBag = form.get("receiptKind") === "bags";
  const rawRate = String(form.get("purchaseRate") ?? "").trim();
  let purchaseRate: number | null = null;
  if (rawRate) {
    if (session.user.role !== "OWNER")
      return { error: "Only the owner can receive and price stock here." };
    try {
      purchaseRate = parseRate(rawRate).toNumber();
    } catch {
      return {
        error:
          "Enter a positive purchase rate with at most two decimal places.",
      };
    }
  }
  if (
    !productId &&
    (session.user.role !== "OWNER" ||
      productName.length < 2 ||
      productName.length > 160)
  )
    return {
      error: "Select a product, or ask the owner to add the product name.",
    };
  const requestedKey = String(form.get("requestKey") ?? "");
  if (
    requestedKey &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      requestedKey,
    )
  )
    return { error: "Reload the receipt form before saving." };
  const requestKey = requestedKey || crypto.randomUUID();
  try {
    await db.$transaction(async (tx) => {
      // A retry of the same form cannot duplicate the product, receipt or posting.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${companyId + requestKey}, 0))`;
      if (
        await tx.purchaseOrder.findFirst({
          where: { id: requestKey, companyId },
        })
      )
        return;
      const supplier = await tx.supplier.findFirst({
        where: { id: supplierId, companyId },
      });
      if (!supplier) throw new Error("Select a mill from this company.");
      let product = productId
        ? await tx.product.findFirst({
            where: { id: productId, companyId, isActive: true },
          })
        : null;
      if (!productId) {
        const unit = isBag ? "BAG" : String(form.get("productUnit") || "METER");
        if (unit !== "BAG" && unit !== "METER" && unit !== "KG")
          throw new Error("Choose a valid stock unit.");
        const existing = await tx.product.findFirst({
          where: {
            companyId,
            name: { equals: productName, mode: "insensitive" },
            unit,
            isActive: true,
          },
        });
        if (existing)
          throw new Error(
            "This product already exists. Choose it from the product list.",
          );
        product = await tx.product.create({
          data: {
            companyId,
            supplierId,
            name: productName,
            unit,
            purchasePrice: 0,
            salePrice: 0,
          },
        });
      }
      if (!product) throw new Error("Select a product from this company.");
      if (isBag && product.unit !== "BAG")
        throw new Error("Select a product with the BAG stock unit.");
      const date = new Date();
      const number = await allocateDocumentNumber(
        tx,
        companyId,
        "PURCHASE_ORDER",
        date,
      );
      const receipt = await tx.purchaseOrder.create({
        data: {
          id: requestKey,
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
            manufactureDate: manufactureDate || null,
            expiryDate: expiryDate || null,
            lot,
            detail: String(form.get("detail") ?? "").slice(0, 500),
          }),
          items: {
            create: {
              productId: product.id,
              quantity,
              purchasePrice: 0,
              totalAmount: 0,
            },
          },
        },
      });
      if (purchaseRate !== null)
        await postReceivedLot(
          tx,
          companyId,
          userId,
          session.user.name ?? "Office user",
          receipt.id,
          purchaseRate,
        );
    });
  } catch (error) {
    return { error: saveError(error) };
  }
  revalidatePath("/mills");
  revalidatePath("/godown");
  revalidatePath("/receipts");
  revalidatePath("/inventory");
  revalidatePath("/purchases");
  revalidatePath("/sales/new");
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
  const id = String(form.get("id") ?? "");
  let rate: number,
    saleRate = 0;
  try {
    rate = parseRate(String(form.get("rate") ?? "")).toNumber();
    if (String(form.get("saleRate") ?? "").trim())
      saleRate = parseRate(String(form.get("saleRate"))).toNumber();
  } catch {
    return {
      error: "Enter a positive purchase rate with at most two decimal places.",
    };
  }
  try {
    await db.$transaction(async (tx) => {
      await postReceivedLot(
        tx,
        companyId,
        userId,
        session.user.name ?? "Office user",
        id,
        rate,
        saleRate,
      );
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

async function postReceivedLot(
  tx: Transaction,
  companyId: string,
  userId: string,
  userName: string,
  id: string,
  rate: number,
  saleRate = 0,
) {
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
    manufactureDate?: string;
    expiryDate?: string;
  };
  if (meta.kind !== "unpriced-receipt" || !meta.lot)
    throw new Error("This is not an unpriced receipt");
  const item = receipt.items[0];
  const amount = new Decimal(item.quantity).times(rate).toFixed(2);
  const batch = await tx.productBatch.create({
    data: {
      companyId,
      productId: item.productId,
      batchNumber: meta.lot,
      manufactureDate: meta.manufactureDate
        ? new Date(meta.manufactureDate)
        : null,
      expiryDate: meta.expiryDate ? new Date(meta.expiryDate) : null,
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
      userName: userName,
      action: "POST",
      entity: "PurchaseOrder",
      entityId: id,
      detail:
        "Godown receipt posted at purchase rate; selling rate may be set on the bill",
    },
  });
}
