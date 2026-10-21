"use server";
import { db } from "@/lib/db";
import { authorize, forbiddenAction } from "@/lib/authorization";
import { allocateDocumentNumber } from "@/lib/document-number";
import {
  postDirectDeal,
  postCustomerReceipt,
  postSupplierPayment,
  reversePosting,
} from "@/lib/accounting/posting-service";
import { validQuantity } from "@/lib/quantities";
import Decimal from "decimal.js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
export async function createDirect(
  _: { error?: string } | null,
  form: FormData,
) {
  const authorization = await authorize("SALE_CREATE");
  if (!authorization.ok) return forbiddenAction;
  const actor = authorization.actor;
  const supplierId = String(form.get("supplierId") ?? ""),
    customerId = String(form.get("customerId") ?? ""),
    description = String(form.get("description") ?? "").trim();
  const quantity = Number(form.get("quantity")),
    costRate = Number(form.get("costRate")),
    saleRate = Number(form.get("saleRate")),
    unit = String(form.get("unit") ?? "BAG");
  const key = String(form.get("key") ?? "");
  if (
    !/^[a-f0-9-]{36}$/i.test(key) ||
    !description ||
    !validQuantity(quantity) ||
    !Number.isFinite(costRate) ||
    costRate <= 0 ||
    !Number.isFinite(saleRate) ||
    saleRate <= 0 ||
    !["BAG", "KG", "METER", "THAAN"].includes(unit)
  )
    return {
      error: "Enter the description, unit, positive quantity and both rates.",
    };
  const buyerCash = form.get("buyerMode") === "CASH",
    millCash = form.get("millMode") === "CASH";
  if (actor.role !== "OWNER" && actor.role !== "ACCOUNTANT")
    return {
      error:
        "The owner or bookkeeper posts direct deals and their purchase costs.",
    };
  let invoiceId = "";
  try {
    await db.$transaction(
      async (tx) => {
        const prior = await tx.saleInvoice.findFirst({
          where: { companyId: actor.companyId, directKey: key },
        });
        if (prior) {
          invoiceId = prior.id;
          return;
        }
        const [supplier, customer] = await Promise.all([
          tx.supplier.findFirst({
            where: { id: supplierId, companyId: actor.companyId },
          }),
          tx.customer.findFirst({
            where: { id: customerId, companyId: actor.companyId },
          }),
        ]);
        if (!supplier || !customer)
          throw new Error("Select a mill and buyer belonging to this company");
        const cost = new Decimal(quantity).times(costRate).toDecimalPlaces(2),
          sale = new Decimal(quantity).times(saleRate).toDecimalPlaces(2);
        const date = new Date(),
          number = await allocateDocumentNumber(
            tx,
            actor.companyId,
            "DIRECT_DEAL",
            date,
          );
        const purchase = await tx.purchaseOrder.create({
          data: {
            companyId: actor.companyId,
            supplierId,
            userId: actor.id,
            poNumber: number,
            orderDate: date,
            totalAmount: cost.toFixed(2),
            netAmount: cost.toFixed(2),
            status: "POSTED",
            notes: `Direct: ${description} · ${quantity} ${unit}. Never entered godown.`,
            directDeal: { description, quantity, unit },
          },
        });
        const invoice = await tx.saleInvoice.create({
          data: {
            companyId: actor.companyId,
            customerId,
            userId: actor.id,
            invoiceNumber: number,
            invoiceDate: date,
            totalAmount: sale.toFixed(2),
            netAmount: sale.toFixed(2),
            paidAmount: buyerCash ? sale.toFixed(2) : 0,
            isCashSale: buyerCash,
            paymentMode: buyerCash ? "CASH" : "CREDIT",
            status: "POSTED",
            directKey: key,
            notes: `Direct: ${description} · ${quantity} ${unit}. Never entered godown.`,
            directDeal: {
              purchaseId: purchase.id,
              supplierId,
              description,
              quantity,
              unit,
              costRate,
              saleRate,
            },
          },
        });
        invoiceId = invoice.id;
        await tx.purchaseOrder.update({
          where: { id: purchase.id },
          data: { directDeal: { invoiceId, description, quantity, unit } },
        });
        await postDirectDeal(tx, {
          companyId: actor.companyId,
          sourceId: invoiceId,
          number,
          date,
          amount: sale.toFixed(2),
          cost: cost.toFixed(2),
          paymentMode: "CREDIT",
          millPaymentMode: "CREDIT",
        });
        if (buyerCash) {
          const receipt = await tx.customerPayment.create({
            data: {
              companyId: actor.companyId,
              customerId,
              invoiceId,
              paymentDate: date,
              amount: sale.toFixed(2),
              paymentMode: "CASH",
              status: "POSTED",
              notes: `Direct ${number}`,
            },
          });
          await postCustomerReceipt(tx, {
            companyId: actor.companyId,
            sourceId: receipt.id,
            number,
            date,
            amount: sale.toFixed(2),
            paymentMode: "CASH",
          });
        }
        if (millCash) {
          const payment = await tx.supplierPayment.create({
            data: {
              companyId: actor.companyId,
              supplierId,
              purchaseOrderId: purchase.id,
              paymentDate: date,
              amount: cost.toFixed(2),
              paymentMode: "CASH",
              status: "POSTED",
              notes: `Direct ${number}`,
            },
          });
          await postSupplierPayment(tx, {
            companyId: actor.companyId,
            sourceId: payment.id,
            number,
            date,
            amount: cost.toFixed(2),
            paymentMode: "CASH",
          });
        }
        await tx.auditLog.create({
          data: {
            companyId: actor.companyId,
            userId: actor.id,
            userName: actor.name ?? "",
            action: "POST",
            entity: "DirectDeal",
            entityId: invoiceId,
            detail: JSON.stringify({ number, purchaseId: purchase.id }),
          },
        });
      },
      { timeout: 15000 },
    );
  } catch (e) {
    const prior = await db.saleInvoice.findFirst({
      where: { companyId: actor.companyId, directKey: key },
      select: { id: true },
    });
    if (prior) invoiceId = prior.id;
    else
      return {
        error: e instanceof Error ? e.message : "Could not post direct deal",
      };
  }
  revalidatePath("/sales");
  revalidatePath("/purchases");
  revalidatePath("/sales/direct");
  redirect(`/sales/${invoiceId}`);
}
export async function cancelDirect(
  _: { error?: string } | null,
  form: FormData,
) {
  const authorization = await authorize("SALE_CANCEL");
  if (!authorization.ok) return forbiddenAction;
  const actor = authorization.actor,
    id = String(form.get("id") ?? ""),
    reason = String(form.get("reason") ?? "").trim();
  if (reason.length < 3) return { error: "Give a reason for cancellation." };
  try {
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "SaleInvoice" WHERE id = ${id} AND "companyId" = ${actor.companyId} FOR UPDATE`;
      const invoice = await tx.saleInvoice.findFirst({
        where: { id, companyId: actor.companyId, status: "POSTED" },
        include: { payments: { where: { status: "POSTED" } } },
      });
      const meta = invoice?.directDeal as { purchaseId?: string } | null;
      if (!invoice || !meta?.purchaseId)
        throw new Error("Posted direct deal not found");
      const purchase = await tx.purchaseOrder.findFirst({
        where: { id: meta.purchaseId, companyId: actor.companyId },
        include: { payments: { where: { status: "POSTED", isVoided: false } } },
      });
      if (!purchase || invoice.payments.length || purchase.payments.length)
        throw new Error(
          "Reverse linked receipts and mill payments before cancelling this deal",
        );
      await reversePosting(tx, actor.companyId, "DIRECT_DEAL", id, reason);
      const state = {
        status: "REVERSED" as const,
        reversedAt: new Date(),
        reversedBy: actor.id,
        reversalReason: reason,
      };
      await tx.saleInvoice.update({ where: { id }, data: state });
      await tx.purchaseOrder.update({
        where: { id: purchase.id },
        data: state,
      });
      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          userId: actor.id,
          userName: actor.name ?? "",
          action: "REVERSE",
          entity: "DirectDeal",
          entityId: id,
          reason,
        },
      });
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not reverse direct deal",
    };
  }
  revalidatePath("/sales/direct");
  revalidatePath("/sales");
  revalidatePath("/purchases");
  return {};
}
