"use server";
import { saveError } from "@/lib/save-error";
import { db } from "@/lib/db";
import { authorize, type Permission } from "@/lib/authorization";
import { revalidatePath } from "next/cache";
import {
  createCustomerOrder,
  issueProduction,
  receiveProduction,
  returnProductionYarn,
  payProductionUnit,
  reverseProduction,
  movePartyStock,
  rate,
  quantity,
} from "@/lib/mars-workflows";
import type { WorkflowState } from "@/components/workflow-form";
const text = (f: FormData, k: string) => String(f.get(k) || "").trim();
const requestId = (f: FormData) => {
  const id = text(f, "requestKey");
  if (!/^[0-9a-f-]{36}$/i.test(id))
    throw new Error("Reload the form before saving");
  return id;
};
async function perform(
  permission: Permission,
  operation: (
    companyId: string,
    userId: string,
    userName: string,
  ) => Promise<unknown>,
): Promise<WorkflowState> {
  const a = await authorize(permission);
  if (!a.ok) return { error: "You do not have permission to do this" };
  try {
    await operation(
      a.actor.companyId,
      a.actor.id,
      a.actor.name ?? "Office user",
    );
  } catch (error) {
    return { error: saveError(error) };
  }
  for (const path of [
    "/stock",
    "/stock/production",
    "/sales/orders",
    "/sales/new",
    "/godown",
    "/inventory",
    "/accounts",
    "/reports",
  ])
    revalidatePath(path);
  return { success: "Saved successfully" };
}
export async function createOrder(_: WorkflowState, f: FormData) {
  return perform("SALE_CREATE", (companyId) =>
    createCustomerOrder(
      companyId,
      text(f, "customerId"),
      JSON.parse(text(f, "linesJson")),
      text(f, "notes"),
      requestId(f),
    ),
  );
}
export async function closeOrder(_: WorkflowState, f: FormData) {
  return perform("SALE_EDIT", async (companyId) => {
    const order = await db.customerOrder.updateMany({
      where: { id: text(f, "id"), companyId, status: "OPEN" },
      data: { status: "CLOSED" },
    });
    if (!order.count) throw new Error("Open order not found");
  });
}
export async function createUnit(_: WorkflowState, f: FormData) {
  return perform("ACCOUNTING_MANAGE", async (companyId) => {
    const name = text(f, "name");
    if (name.length < 2) throw new Error("Enter the production unit name");
    return db.productionUnit.create({
      data: {
        id: requestId(f),
        companyId,
        name,
        wageRate: rate(text(f, "wageRate")).toFixed(2),
      },
    });
  });
}
export async function issueYarn(_: WorkflowState, f: FormData) {
  return perform("ACCOUNTING_MANAGE", (companyId) =>
    issueProduction(companyId, {
      unitId: text(f, "unitId"),
      yarnBatchId: text(f, "yarnBatchId"),
      clothProductId: text(f, "clothProductId"),
      quantity: text(f, "quantity"),
      wageRate: text(f, "wageRate"),
      requestId: requestId(f),
    }),
  );
}
export async function receiveCloth(_: WorkflowState, f: FormData) {
  return perform("ACCOUNTING_MANAGE", (companyId) =>
    receiveProduction(companyId, {
      jobId: text(f, "jobId"),
      meters: text(f, "meters"),
      yarnConsumed: text(f, "yarnConsumed"),
      lengths: text(f, "lengths"),
      salePrice: text(f, "salePrice"),
      requestId: requestId(f),
    }),
  );
}
export async function returnYarn(_: WorkflowState, f: FormData) {
  return perform("ACCOUNTING_MANAGE", (companyId) =>
    returnProductionYarn(
      companyId,
      text(f, "jobId"),
      text(f, "quantity"),
      requestId(f),
    ),
  );
}
export async function payUnit(_: WorkflowState, f: FormData) {
  return perform("ACCOUNTING_MANAGE", (companyId) =>
    payProductionUnit(companyId, {
      unitId: text(f, "unitId"),
      amount: text(f, "amount"),
      paymentMode: text(f, "paymentMode"),
      reference: text(f, "reference"),
      requestId: requestId(f),
    }),
  );
}
export async function reverseEntry(_: WorkflowState, f: FormData) {
  return perform("ACCOUNTING_MANAGE", (companyId) => {
    const kind = text(f, "kind");
    if (kind !== "receipt" && kind !== "payment")
      throw new Error("Choose a receipt or payment");
    return reverseProduction(companyId, text(f, "id"), kind, text(f, "reason"));
  });
}
export async function partyMovement(_: WorkflowState, f: FormData) {
  return perform("STOCK_ADJUST", (companyId) =>
    movePartyStock(companyId, {
      customerId: text(f, "customerId"),
      productId: text(f, "productId"),
      quantity: text(f, "quantity"),
      direction: text(f, "direction"),
      reference: text(f, "reference"),
      notes: text(f, "notes"),
      requestId: requestId(f),
    }),
  );
}

export async function amendOrderItem(_: WorkflowState, f: FormData) {
  return perform("SALE_EDIT", async (companyId, userId, userName) => {
    const qty = quantity(text(f, "quantity")),
      reason = text(f, "reason");
    if (reason.length < 5) throw new Error("Enter a correction reason");
    await db.$transaction(async (tx) => {
      const initial = await tx.customerOrderItem.findFirst({
        where: { id: text(f, "id"), order: { companyId } },
      });
      if (!initial) throw new Error("Order item not found");
      await tx.$queryRaw`SELECT id FROM "CustomerOrder" WHERE id=${initial.orderId} AND "companyId"=${companyId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "CustomerOrderItem" WHERE id=${initial.id} FOR UPDATE`;
      const item = await tx.customerOrderItem.findFirst({
        where: { id: initial.id, order: { companyId, status: "OPEN" } },
      });
      if (!item) throw new Error("Open order item not found");
      const deliveries = await tx.saleInvoiceItem.aggregate({
        where: { orderItemId: item.id, invoice: { status: "POSTED" } },
        _sum: { quantity: true },
      });
      if (qty.lt(deliveries._sum.quantity?.toString() || 0))
        throw new Error(
          "Ordered quantity cannot be less than the quantity already delivered",
        );
      await tx.customerOrderItem.update({
        where: { id: item.id },
        data: { quantity: qty.toFixed(3) },
      });
      await tx.auditLog.create({
        data: {
          companyId,
          userId,
          userName,
          action: "UPDATE",
          entity: "CustomerOrderItem",
          entityId: item.id,
          reason,
          detail: JSON.stringify({
            oldQuantity: item.quantity.toString(),
            newQuantity: qty.toFixed(3),
          }),
        },
      });
    });
  });
}
export async function updateUnit(_: WorkflowState, f: FormData) {
  return perform("ACCOUNTING_MANAGE", async (companyId, userId, userName) => {
    const name = text(f, "name"),
      wageRate = rate(text(f, "wageRate"));
    if (name.length < 2) throw new Error("Enter the unit name");
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ProductionUnit" WHERE id=${text(f, "id")} AND "companyId"=${companyId} FOR UPDATE`;
      const unit = await tx.productionUnit.findFirst({
        where: { id: text(f, "id"), companyId },
      });
      if (!unit) throw new Error("Production unit not found");
      await tx.productionUnit.update({
        where: { id: unit.id },
        data: { name, wageRate: wageRate.toFixed(2) },
      });
      await tx.auditLog.create({
        data: {
          companyId,
          userId,
          userName,
          action: "UPDATE",
          entity: "ProductionUnit",
          entityId: unit.id,
          detail: JSON.stringify({
            oldName: unit.name,
            newName: name,
            oldRate: unit.wageRate.toString(),
            newRate: wageRate.toFixed(2),
          }),
        },
      });
    });
  });
}

export async function recordThaanLengths(_: WorkflowState, f: FormData) {
  return perform("STOCK_ADJUST", async (companyId) => {
    const { measureThaans } = await import("@/lib/mars-workflows");
    await measureThaans(
      companyId,
      text(f, "batchId"),
      text(f, "lengths"),
      requestId(f),
    );
  });
}
export async function reverseThaanLengths(_: WorkflowState, f: FormData) {
  return perform("STOCK_ADJUST", async (companyId) => {
    const { reverseThaanMeasurement } = await import("@/lib/mars-workflows");
    await reverseThaanMeasurement(
      companyId,
      text(f, "sourceId"),
      text(f, "reason"),
    );
  });
}
