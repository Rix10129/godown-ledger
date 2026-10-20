"use server";

import { assertPermission } from "@/lib/authorization";

import Decimal from "decimal.js";
import { validQuantity } from "@/lib/quantities";
import { reserveBatchStock } from "@/lib/inventory-reconciliation";
import { db } from "@/lib/db";
import { allocateDocumentNumber } from "@/lib/document-number";
import { getActiveSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MovementType } from "@prisma/client";
import {
  postPurchase,
  postPurchaseReturn,
  reversePosting,
} from "@/lib/accounting/posting-service";
import {
  assertDocumentCanBeDeleted,
  recordReversalAudit,
  requireReversalReason,
} from "@/lib/document-lifecycle";
import { authorize, forbiddenAction } from "@/lib/authorization";
import { lineBase, calculateDocumentTotals } from "@/lib/invoice-math";

type ActionState = { error: string } | null;

export async function deletePurchase(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const authorization = await authorize("PURCHASE_CANCEL");
  if (!authorization.ok) return forbiddenAction;
  const user = authorization.actor;
  const companyId = user.companyId;
  const id = (formData.get("id") as string)?.trim();

  try {
    await db.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findFirst({
        where: { id, companyId },
        include: { items: true, payments: true, returns: true },
      });
      if (!po) throw new Error("Purchase order not found");
      if (po.directDeal)
        throw new Error("Reverse this from Sales → Direct deals");
      const postings = await tx.journalEntry.count({
        where: { companyId, sourceType: "PURCHASE", sourceId: id },
      });
      assertDocumentCanBeDeleted(po.status, {
        stockMovements: po.items.length,
        payments: po.payments.length,
        returns: po.returns.length,
        journalEntries: postings,
      });
      await tx.purchaseOrder.delete({ where: { id } });
    });
  } catch (e: any) {
    return { error: e?.message ?? "Failed to delete purchase order" };
  }

  revalidatePath("/purchases");
  revalidatePath("/inventory");
  redirect("/purchases");
}

export async function reversePurchase(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const authorization = await authorize("PURCHASE_CANCEL");
  if (!authorization.ok) return forbiddenAction;
  const user = authorization.actor;
  const companyId = user.companyId;
  const id = String(formData.get("id") || "").trim();
  let reason: string;
  try {
    reason = requireReversalReason(formData.get("reason"));
  } catch (e) {
    return { error: (e as Error).message };
  }
  try {
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "PurchaseOrder" WHERE id = ${id} AND "companyId" = ${companyId} FOR UPDATE`;
      const po = await tx.purchaseOrder.findFirst({
        where: { id, companyId },
        include: {
          items: { include: { batch: true } },
          payments: true,
          returns: true,
        },
      });
      if (!po) throw new Error("Purchase order not found");
      if (po.directDeal)
        throw new Error("Reverse this from Sales → Direct deals");
      if (po.status !== "POSTED")
        throw new Error("Only posted purchases can be reversed");
      if (po.payments.length || po.returns.length)
        throw new Error(
          "Reverse linked payments and returns before reversing this purchase",
        );
      for (const item of po.items) {
        if (!item.batchId || !item.batch || item.batch.quantity < item.quantity)
          throw new Error(
            "Purchase stock has been consumed; create returns for dependent sales first",
          );
        await reserveBatchStock(tx, {
          companyId,
          productId: item.productId,
          batchId: item.batchId,
          quantity: item.quantity,
        });
        await tx.stockMovement.create({
          data: {
            companyId,
            productId: item.productId,
            batchId: item.batchId,
            type: MovementType.PURCHASE_RETURN,
            quantity: -item.quantity,
            reference: `REV-${po.poNumber}`,
            sourceType: "PURCHASE_REVERSAL",
            sourceId: po.id,
            notes: reason,
          },
        });
      }
      // Legacy purchases predating the posting service have no journal entry
      // to reverse — still allow the document itself to be voided.
      const journal = await reversePosting(
        tx,
        companyId,
        "PURCHASE",
        id,
        reason,
      );
      await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: "REVERSED",
          reversedAt: new Date(),
          reversedBy: user.id,
          reversalReason: reason,
        },
      });
      await recordReversalAudit(tx, {
        companyId,
        userId: user.id,
        userName: user.name ?? "",
        entity: "PurchaseOrder",
        originalDocumentId: id,
        reversalDocumentId: journal?.id ?? null,
        reason,
      });
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to reverse purchase",
    };
  }
  revalidatePath("/purchases");
  revalidatePath("/inventory");
  redirect(`/purchases/${id}`);
}

type PurchaseReturnLine = {
  productId: string;
  batchId: string;
  quantity: number;
  purchasePrice: number;
};

export async function createPurchaseReturn(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const authorization = await authorize("PURCHASE_CANCEL");
  if (!authorization.ok) return forbiddenAction;
  const { companyId } = authorization.actor;
  const purchaseOrderId = String(form.get("purchaseOrderId") ?? "").trim();
  if (!purchaseOrderId)
    return {
      error:
        "Open the original purchase and choose Return. A return must reference a posted purchase.",
    };
  let lines: PurchaseReturnLine[];
  try {
    lines = JSON.parse(String(form.get("linesJson") ?? ""));
  } catch {
    return { error: "Invalid return items" };
  }
  if (
    !Array.isArray(lines) ||
    !lines.length ||
    lines.some((l) => !validQuantity(l.quantity))
  )
    return { error: "Enter positive quantities with at most 3 decimals." };
  if (new Set(lines.map((l) => l.batchId)).size !== lines.length)
    return { error: "Combine duplicate lots into one return line." };
  let returnId = "";
  try {
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "PurchaseOrder" WHERE id = ${purchaseOrderId} AND "companyId" = ${companyId} FOR UPDATE`;
      const purchase = await tx.purchaseOrder.findFirst({
        where: { id: purchaseOrderId, companyId, status: "POSTED" },
        include: { items: { include: { batch: true } } },
      });
      if (!purchase || purchase.directDeal)
        throw new Error("Posted stock purchase not found");
      const details = [];
      for (const line of lines) {
        const original = purchase.items.find(
          (i) => i.batchId === line.batchId && i.productId === line.productId,
        );
        if (!original?.batch)
          throw new Error("This lot does not belong to that purchase");
        const returned = await tx.purchaseReturnItem.aggregate({
          where: {
            batchId: line.batchId,
            purchaseReturn: { purchaseOrderId, companyId, status: "POSTED" },
          },
          _sum: { quantity: true },
        });
        if (
          new Decimal(line.quantity)
            .plus(String(returned._sum.quantity ?? 0))
            .gt(original.quantity)
        )
          throw new Error(
            "Return exceeds the quantity originally purchased, after previous returns",
          );
        const cost = new Decimal(original.batch.purchasePrice.toString())
          .times(line.quantity)
          .toDecimalPlaces(2);
        const tax = new Decimal(original.totalAmount.toString())
          .times(original.taxRate.toString())
          .div(100)
          .times(line.quantity)
          .div(original.quantity)
          .toDecimalPlaces(2);
        details.push({
          ...line,
          cost,
          tax,
          rate: original.batch.purchasePrice,
        });
      }
      const amount = details.reduce(
          (sum, l) => sum.plus(l.cost).plus(l.tax),
          new Decimal(0),
        ),
        tax = details.reduce((sum, l) => sum.plus(l.tax), new Decimal(0));
      const date = new Date(
        String(form.get("returnDate") || new Date().toISOString()),
      );
      if (!Number.isFinite(date.getTime()))
        throw new Error("Invalid return date");
      const number = await allocateDocumentNumber(
        tx,
        companyId,
        "PURCHASE_RETURN",
        date,
      );
      const ret = await tx.purchaseReturn.create({
        data: {
          companyId,
          supplierId: purchase.supplierId,
          purchaseOrderId,
          returnNumber: number,
          returnDate: date,
          totalAmount: amount.toFixed(2),
          status: "POSTED",
          notes: String(form.get("notes") ?? ""),
        },
      });
      returnId = ret.id;
      for (const line of details) {
        await reserveBatchStock(tx, {
          companyId,
          batchId: line.batchId,
          productId: line.productId,
          quantity: line.quantity,
        });
        await tx.purchaseReturnItem.create({
          data: {
            purchaseReturnId: ret.id,
            productId: line.productId,
            batchId: line.batchId,
            quantity: line.quantity,
            purchasePrice: line.rate,
            totalAmount: line.cost.plus(line.tax).toFixed(2),
          },
        });
        await tx.stockMovement.create({
          data: {
            companyId,
            productId: line.productId,
            batchId: line.batchId,
            type: "PURCHASE_RETURN",
            quantity: -line.quantity,
            reference: number,
            sourceType: "PURCHASE_RETURN",
            sourceId: ret.id,
          },
        });
      }
      await postPurchaseReturn(tx, {
        companyId,
        sourceId: ret.id,
        number,
        date,
        amount: amount.toFixed(2),
        tax: tax.toFixed(2),
      });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not post return" };
  }
  revalidatePath("/inventory");
  revalidatePath("/purchases");
  redirect(`/purchases/returns/${returnId}`);
}

type LineInput = {
  productId: string;
  batchNumber: string;
  manufactureDate: string | null;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  discount: number;
  taxRate: number;
};

export async function createPurchase(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const authorization = await authorize("PURCHASE_CREATE");
  if (!authorization.ok) return forbiddenAction;
  const user = authorization.actor;
  const companyId = user.companyId;
  const userId = user.id;

  const supplierId = (formData.get("supplierId") as string)?.trim();
  if (!supplierId) return { error: "Supplier is required" };

  const orderDate =
    (formData.get("orderDate") as string) || new Date().toISOString();
  const paidAmount = Math.max(
    0,
    parseFloat(formData.get("paidAmount") as string) || 0,
  );
  const discountAmount = Math.max(
    0,
    parseFloat(formData.get("discountAmount") as string) || 0,
  );
  const notes = (formData.get("notes") as string)?.trim() || null;
  const linesJson = formData.get("linesJson") as string;

  if (!linesJson) return { error: "No line items provided" };

  let lines: LineInput[];
  try {
    lines = JSON.parse(linesJson);
  } catch {
    return { error: "Invalid line data" };
  }
  if (!Array.isArray(lines) || lines.length === 0)
    return { error: "Add at least one line item" };

  // Validate each line
  for (const line of lines) {
    if (!line.batchNumber?.trim())
      return { error: "Batch number is required for all lines" };
    if (!validQuantity(line.quantity))
      return { error: "Quantity must be at least 1" };
    if (!Number.isFinite(line.purchasePrice) || line.purchasePrice <= 0)
      return { error: "Invalid purchase price" };
    if (!Number.isFinite(line.salePrice) || line.salePrice <= 0)
      return { error: "Invalid sale price" };
  }

  // Verify supplier belongs to company
  const supplier = await db.supplier.findFirst({
    where: { id: supplierId, companyId },
  });
  if (!supplier) return { error: "Supplier not found" };

  let purchaseId = "";

  try {
    await db.$transaction(async (tx) => {
      const orderDateValue = new Date(orderDate);
      const poNumber = await allocateDocumentNumber(
        tx,
        companyId,
        "PURCHASE_ORDER",
        orderDateValue,
      );

      // Compute totals
      const { totalAmount, taxAmount, netAmount } = calculateDocumentTotals(
        lines,
        (l) => l.purchasePrice,
        discountAmount,
      );

      if (!Number.isFinite(paidAmount) || paidAmount > netAmount)
        throw new Error("Paid amount exceeds the purchase total");
      // Create purchase order
      const po = await tx.purchaseOrder.create({
        data: {
          status: "POSTED",
          companyId,
          supplierId,
          userId,
          poNumber,
          orderDate: orderDateValue,
          totalAmount,
          discountAmount,
          taxAmount,
          netAmount,
          paidAmount: Math.min(paidAmount, netAmount + 0.001),
          notes,
        },
      });

      purchaseId = po.id;

      // Process each line: create batch, link to PO item, record movement
      for (const line of lines) {
        const lineTotal = lineBase(
          line.quantity,
          line.purchasePrice,
          line.discount,
        );
        const product = await tx.product.findFirst({
          where: { id: line.productId, companyId, isActive: true },
        });
        if (!product) throw new Error("Product not found in this company");
        const costRate = new Decimal(lineTotal)
          .times(new Decimal(totalAmount).minus(discountAmount))
          .div(totalAmount)
          .div(line.quantity);

        // Create the batch — each purchase line always creates a fresh batch
        const batch = await tx.productBatch.create({
          data: {
            companyId,
            productId: line.productId,
            batchNumber: line.batchNumber.trim(),
            expiryDate: line.expiryDate ? new Date(line.expiryDate) : null,
            manufactureDate: line.manufactureDate
              ? new Date(line.manufactureDate)
              : null,
            purchasePrice: costRate.toFixed(8),
            salePrice: line.salePrice,
            quantity: line.quantity,
            initialQuantity: line.quantity,
          },
        });

        await tx.purchaseOrderItem.create({
          data: {
            purchaseOrderId: po.id,
            productId: line.productId,
            batchId: batch.id,
            quantity: line.quantity,
            purchasePrice: line.purchasePrice,
            discount: line.discount,
            taxRate: line.taxRate,
            totalAmount: lineTotal,
          },
        });

        await tx.stockMovement.create({
          data: {
            companyId,
            productId: line.productId,
            batchId: batch.id,
            type: MovementType.PURCHASE,
            sourceType: "PURCHASE",
            sourceId: po.id,
            quantity: line.quantity,
            reference: poNumber,
            notes: `Purchase ${poNumber}`,
          },
        });
      }
      await postPurchase(tx, {
        companyId,
        sourceId: po.id,
        number: poNumber,
        date: po.orderDate,
        amount: po.netAmount,
        tax: po.taxAmount,
        paid: po.paidAmount,
        paymentMode: "CASH",
      });
    });
  } catch (e: any) {
    // Catch unique constraint on batch number
    if (e?.code === "P2002") {
      return {
        error:
          "A batch with that number already exists for one of the selected products",
      };
    }
    return { error: e?.message ?? "Failed to create purchase order" };
  }

  revalidatePath("/purchases");
  revalidatePath("/inventory");
  revalidatePath("/alerts");
  redirect(`/purchases/${purchaseId}`);
}
