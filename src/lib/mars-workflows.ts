import { db, type Transaction } from "./db";
import Decimal from "decimal.js";
import { Prisma } from "@prisma/client";
import { allocateDocumentNumber } from "./document-number";
import { reserveBatchStock } from "./inventory-reconciliation";
import {
  postProductionIssue,
  postProductionReceipt,
  postProductionPayment,
  reversePosting,
} from "./accounting/posting-service";

export function quantity(value: unknown) {
  const n = new Decimal(String(value));
  if (
    !n.isFinite() ||
    n.lte(0) ||
    n.decimalPlaces() > 3 ||
    n.gte("100000000000")
  )
    throw new Error(
      "Enter a positive quantity with at most three decimal places",
    );
  return n;
}
export function rate(value: unknown) {
  const n = new Decimal(String(value));
  if (
    !n.isFinite() ||
    n.lte(0) ||
    n.decimalPlaces() > 2 ||
    n.gte("10000000000")
  )
    throw new Error("Enter a positive rate with at most two decimal places");
  return n;
}
export function thaanLengths(raw: string, meters: Decimal) {
  const lengths = raw.trim()
    ? raw
        .trim()
        .split(/[\s,;]+/)
        .map(quantity)
    : [];
  if (lengths.length > 500)
    throw new Error("Receive at most 500 thaans at a time");
  if (
    lengths.length &&
    !lengths.reduce((a, b) => a.plus(b), new Decimal(0)).equals(meters)
  )
    throw new Error("Thaan lengths must add up to the metres received");
  return lengths;
}
export async function createCustomerOrder(
  companyId: string,
  customerId: string,
  items: { productId: string; quantity: unknown }[],
  notes?: string,
  requestId = crypto.randomUUID(),
) {
  if (!items.length || items.length > 100)
    throw new Error("Enter between 1 and 100 order lines");
  if (new Set(items.map((i) => i.productId)).size !== items.length)
    throw new Error("Combine repeated qualities into one order line");
  return db.$transaction(async (tx) => {
    const prior = await tx.customerOrder.findFirst({
      where: { id: requestId, companyId },
    });
    if (prior) return prior;
    if (
      !(await tx.customer.findFirst({ where: { id: customerId, companyId } }))
    )
      throw new Error("Customer not found");
    const products = await tx.product.count({
      where: {
        id: { in: items.map((i) => i.productId) },
        companyId,
        isActive: true,
      },
    });
    if (products !== items.length)
      throw new Error("One or more products are unavailable");
    const orderNumber = await allocateDocumentNumber(
      tx,
      companyId,
      "CUSTOMER_ORDER",
      new Date(),
    );
    return tx.customerOrder.create({
      data: {
        id: requestId,
        companyId,
        customerId,
        orderNumber,
        notes,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: quantity(i.quantity).toFixed(3),
          })),
        },
      },
    });
  });
}
export async function validateOrderDelivery(
  tx: Transaction,
  companyId: string,
  customerId: string | null,
  lines: { orderItemId?: string; productId: string; quantity: number }[],
) {
  const ids = [
    ...new Set(
      lines.map((l) => l.orderItemId).filter((id): id is string => !!id),
    ),
  ].sort();
  const orderIds = [
    ...new Set(
      (
        await tx.customerOrderItem.findMany({
          where: { id: { in: ids }, order: { companyId } },
          select: { orderId: true },
        })
      ).map((i) => i.orderId),
    ),
  ].sort();
  for (const orderId of orderIds)
    await tx.$queryRaw`SELECT id FROM "CustomerOrder" WHERE id=${orderId} AND "companyId"=${companyId} FOR UPDATE`;
  for (const id of ids) {
    await tx.$queryRaw`SELECT i.id FROM "CustomerOrderItem" i JOIN "CustomerOrder" o ON o.id=i."orderId" WHERE i.id=${id} AND o."companyId"=${companyId} FOR UPDATE OF i`;
    const item = await tx.customerOrderItem.findFirst({
      where: {
        id,
        order: { companyId, customerId: customerId ?? "", status: "OPEN" },
      },
      include: {
        invoiceItems: {
          where: { invoice: { status: "POSTED" } },
          select: { quantity: true },
        },
      },
    });
    if (!item)
      throw new Error("Order is closed or belongs to another customer");
    const requested = lines.filter((l) => l.orderItemId === id);
    if (requested.some((l) => l.productId !== item.productId))
      throw new Error("Order quality does not match the invoice product");
    const used = item.invoiceItems.reduce(
      (n, l) => n.plus(l.quantity.toString()),
      new Decimal(0),
    );
    const delivery = requested.reduce(
      (n, l) => n.plus(quantity(l.quantity)),
      new Decimal(0),
    );
    if (used.plus(delivery).gt(item.quantity.toString()))
      throw new Error("Delivery exceeds the remaining customer order");
  }
}
export async function issueProduction(
  companyId: string,
  input: {
    unitId: string;
    yarnBatchId: string;
    clothProductId: string;
    quantity: unknown;
    wageRate?: unknown;
    requestId?: string;
  },
) {
  const qty = quantity(input.quantity),
    requestId = input.requestId || crypto.randomUUID();
  return db.$transaction(async (tx) => {
    const prior = await tx.productionJob.findFirst({
      where: { id: requestId, companyId },
    });
    if (prior) return prior;
    const unit = await tx.productionUnit.findFirst({
      where: { id: input.unitId, companyId },
    });
    const batch = await tx.productBatch.findFirst({
      where: { id: input.yarnBatchId, companyId },
    });
    const cloth = await tx.product.findFirst({
      where: {
        id: input.clothProductId,
        companyId,
        isActive: true,
        unit: "METER",
      },
    });
    if (!unit || !batch || !cloth)
      throw new Error(
        "Select a production unit, yarn batch and cloth product measured in metres",
      );
    const cost = new Decimal(batch.purchasePrice.toString());
    if (cost.lte(0))
      throw new Error("Price the yarn receipt before issuing it to production");
    await reserveBatchStock(tx, {
      batchId: batch.id,
      companyId,
      productId: batch.productId,
      quantity: qty.toNumber(),
    });
    const jobNumber = await allocateDocumentNumber(
      tx,
      companyId,
      "PRODUCTION_JOB",
      new Date(),
    );
    const job = await tx.productionJob.create({
      data: {
        id: requestId,
        companyId,
        unitId: unit.id,
        yarnBatchId: batch.id,
        clothProductId: cloth.id,
        jobNumber,
        issuedQuantity: qty.toFixed(3),
        yarnUnitCost: cost.toFixed(8),
        wageRate: rate(input.wageRate || unit.wageRate).toFixed(2),
      },
    });
    await tx.stockMovement.create({
      data: {
        companyId,
        productId: batch.productId,
        batchId: batch.id,
        type: "ADJUSTMENT",
        quantity: qty.neg().toFixed(3),
        sourceType: "PRODUCTION_ISSUE",
        sourceId: job.id,
        reference: jobNumber,
        notes: "Yarn transferred to weaving unit",
      },
    });
    await postProductionIssue(tx, {
      companyId,
      sourceId: job.id,
      number: jobNumber,
      date: job.createdAt,
      amount: qty.mul(cost),
    });
    return job;
  });
}
export async function receiveProduction(
  companyId: string,
  input: {
    jobId: string;
    meters: unknown;
    yarnConsumed: unknown;
    lengths: string;
    salePrice: unknown;
    requestId?: string;
  },
) {
  const requestId = input.requestId || crypto.randomUUID();
  const meters = quantity(input.meters),
    consumed = quantity(input.yarnConsumed),
    price = rate(input.salePrice),
    lengths = thaanLengths(input.lengths, meters);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "ProductionJob" WHERE id=${input.jobId} AND "companyId"=${companyId} FOR UPDATE`;
    const prior = await tx.productionReceipt.findFirst({
      where: { id: requestId, companyId },
    });
    if (prior) return prior;
    const job = await tx.productionJob.findFirst({
      where: { id: input.jobId, companyId },
    });
    if (!job) throw new Error("Production job not found");
    if (
      consumed
        .plus(job.consumedQuantity.toString())
        .plus(job.returnedQuantity.toString())
        .gt(job.issuedQuantity.toString())
    )
      throw new Error(
        "Yarn consumed exceeds yarn remaining at the production unit",
      );
    const wages = meters.mul(job.wageRate.toString()).toDecimalPlaces(2),
      yarnCost = consumed
        .plus(job.consumedQuantity.toString())
        .plus(job.returnedQuantity.toString())
        .mul(job.yarnUnitCost.toString())
        .toDecimalPlaces(2)
        .minus(job.allocatedYarnCost.toString()),
      total = wages.plus(yarnCost);
    const receiptNumber = await allocateDocumentNumber(
      tx,
      companyId,
      "PRODUCTION_RECEIPT",
      new Date(),
    );
    const receipt = await tx.productionReceipt.create({
      data: {
        id: requestId,
        companyId,
        jobId: job.id,
        receiptNumber,
        meters: meters.toFixed(3),
        yarnConsumed: consumed.toFixed(3),
        wages: wages.toFixed(2),
        yarnCost: yarnCost.toFixed(2),
      },
    });
    await tx.productionJob.update({
      where: { id: job.id },
      data: {
        consumedQuantity: { increment: consumed.toFixed(3) },
        allocatedYarnCost: { increment: yarnCost.toFixed(2) },
      },
    });
    const pieces = lengths.length ? lengths : [meters];
    const receivedBatches = pieces.map((length, i) => ({
      id: crypto.randomUUID(),
      companyId,
      productId: job.clothProductId,
      batchNumber: `${receiptNumber}/${i + 1}`,
      quantity: length.toFixed(3),
      initialQuantity: length.toFixed(3),
      purchasePrice: total.div(meters).toFixed(8),
      salePrice: price.toFixed(2),
      isThaan: !!lengths.length,
      productionReceiptId: receipt.id,
    }));
    await tx.productBatch.createMany({ data: receivedBatches });
    await tx.stockMovement.createMany({
      data: receivedBatches.map((batch) => ({
        companyId,
        productId: batch.productId,
        batchId: batch.id,
        type: "ADJUSTMENT" as const,
        quantity: batch.quantity,
        sourceType: "PRODUCTION_RECEIPT",
        sourceId: receipt.id,
        reference: receiptNumber,
        notes: lengths.length
          ? "Cloth received — individual thaan"
          : "Cloth received — bulk metres",
      })),
    });
    await postProductionReceipt(tx, {
      companyId,
      sourceId: receipt.id,
      number: receiptNumber,
      date: receipt.receiptDate,
      amount: total,
      cost: yarnCost,
      wages,
    });
    return receipt;
  });
}
export async function returnProductionYarn(
  companyId: string,
  jobId: string,
  raw: unknown,
  requestId = crypto.randomUUID(),
) {
  const qty = quantity(raw);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "ProductionJob" WHERE id=${jobId} AND "companyId"=${companyId} FOR UPDATE`;
    const job = await tx.productionJob.findFirst({
      where: { id: jobId, companyId },
      include: { yarnBatch: true },
    });
    if (
      await tx.stockMovement.findFirst({
        where: {
          companyId,
          sourceId: requestId,
          sourceType: "PRODUCTION_YARN_RETURN",
        },
      })
    )
      return;
    if (
      !job ||
      qty
        .plus(job.consumedQuantity.toString())
        .plus(job.returnedQuantity.toString())
        .gt(job.issuedQuantity.toString())
    )
      throw new Error("Return exceeds unused yarn at the unit");
    if (
      await tx.stockMovement.findFirst({
        where: {
          companyId,
          sourceId: requestId,
          sourceType: "PRODUCTION_YARN_RETURN",
        },
      })
    )
      return;
    const sourceId = requestId;
    const yarnCost = qty
      .plus(job.consumedQuantity.toString())
      .plus(job.returnedQuantity.toString())
      .mul(job.yarnUnitCost.toString())
      .toDecimalPlaces(2)
      .minus(job.allocatedYarnCost.toString());
    await tx.productionJob.update({
      where: { id: jobId },
      data: {
        returnedQuantity: { increment: qty.toFixed(3) },
        allocatedYarnCost: { increment: yarnCost.toFixed(2) },
      },
    });
    await tx.productBatch.update({
      where: { id: job.yarnBatchId },
      data: { quantity: { increment: qty.toFixed(3) } },
    });
    await tx.stockMovement.create({
      data: {
        companyId,
        productId: job.yarnBatch.productId,
        batchId: job.yarnBatchId,
        type: "ADJUSTMENT",
        quantity: qty.toFixed(3),
        sourceType: "PRODUCTION_YARN_RETURN",
        sourceId,
        reference: job.jobNumber,
      },
    });
    await postProductionIssue(
      tx,
      {
        companyId,
        sourceId,
        number: job.jobNumber,
        date: new Date(),
        amount: yarnCost,
      },
      true,
    );
  });
}
export async function payProductionUnit(
  companyId: string,
  input: {
    unitId: string;
    amount: unknown;
    paymentMode: string;
    reference?: string;
    requestId?: string;
  },
) {
  const amount = rate(input.amount),
    requestId = input.requestId || crypto.randomUUID();
  if (!["BANK", "CASH"].includes(input.paymentMode))
    throw new Error("Choose cash or bank");
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "ProductionUnit" WHERE id=${input.unitId} AND "companyId"=${companyId} FOR UPDATE`;
    const prior = await tx.productionPayment.findFirst({
      where: { id: requestId, companyId },
    });
    if (prior) return prior;
    const unit = await tx.productionUnit.findFirst({
      where: { id: input.unitId, companyId },
      include: {
        jobs: { include: { receipts: { where: { status: "POSTED" } } } },
        payments: { where: { status: "POSTED" } },
      },
    });
    if (!unit) throw new Error("Production unit not found");
    const due = unit.jobs
      .flatMap((j) => j.receipts)
      .reduce((n, r) => n.plus(r.wages.toString()), new Decimal(0))
      .minus(
        unit.payments.reduce(
          (n, p) => n.plus(p.amount.toString()),
          new Decimal(0),
        ),
      );
    if (amount.gt(due)) throw new Error("Payment exceeds unpaid weaving wages");
    const payment = await tx.productionPayment.create({
      data: {
        id: requestId,
        companyId,
        unitId: unit.id,
        amount: amount.toFixed(2),
        paymentMode: input.paymentMode as "BANK" | "CASH",
        reference: input.reference?.trim() || null,
      },
    });
    await postProductionPayment(tx, {
      companyId,
      sourceId: payment.id,
      number: payment.id,
      date: payment.paymentDate,
      amount,
      paymentMode: payment.paymentMode,
    });
    return payment;
  });
}
export async function reverseProduction(
  companyId: string,
  id: string,
  kind: "receipt" | "payment",
  reason: string,
) {
  if (reason.trim().length < 5)
    throw new Error("Enter a correction reason (at least 5 characters)");
  return db.$transaction(async (tx) => {
    if (kind === "payment") {
      await tx.$queryRaw`SELECT id FROM "ProductionPayment" WHERE id=${id} AND "companyId"=${companyId} FOR UPDATE`;
      const p = await tx.productionPayment.findFirst({
        where: { id, companyId, status: "POSTED" },
      });
      if (!p) throw new Error("Payment not found or already reversed");
      await tx.productionPayment.update({
        where: { id },
        data: { status: "REVERSED" },
      });
      await reversePosting(tx, companyId, "PRODUCTION_PAYMENT", id, reason);
    } else {
      const initial = await tx.productionReceipt.findFirst({
        where: { id, companyId },
      });
      if (!initial) throw new Error("Receipt not found");
      await tx.$queryRaw`SELECT id FROM "ProductionJob" WHERE id=${initial.jobId} AND "companyId"=${companyId} FOR UPDATE`;
      const r = await tx.productionReceipt.findFirst({
        where: { id, companyId, status: "POSTED" },
        include: { batches: true, job: true },
      });
      if (!r) throw new Error("Receipt not found or already reversed");
      await tx.$queryRaw`SELECT id FROM "ProductionUnit" WHERE id=${r.job.unitId} FOR UPDATE`;
      const payments = await tx.productionPayment.aggregate({
        where: { unitId: r.job.unitId, companyId, status: "POSTED" },
        _sum: { amount: true },
      });
      const wages = await tx.productionReceipt.aggregate({
        where: { companyId, status: "POSTED", job: { unitId: r.job.unitId } },
        _sum: { wages: true },
      });
      if (
        new Decimal(wages._sum.wages?.toString() || 0)
          .minus(r.wages.toString())
          .lt(payments._sum.amount?.toString() || 0)
      )
        throw new Error(
          "Reverse the associated wage payment before correcting this receipt",
        );
      const ids = r.batches.map((b) => b.id).sort();
      if (!ids.length) throw new Error("Receipt stock is missing");
      const current = await tx.$queryRaw<
        Array<{
          id: string;
          quantity: Prisma.Decimal;
          initialQuantity: Prisma.Decimal;
        }>
      >(
        Prisma.sql`SELECT id,quantity,"initialQuantity" FROM "ProductBatch" WHERE "companyId"=${companyId} AND id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`,
      );
      if (
        current.length !== ids.length ||
        current.some((b) => !b.quantity.equals(b.initialQuantity))
      )
        throw new Error(
          "This cloth has been used; correct later stock movements first",
        );
      if (
        await tx.stockMovement.findFirst({
          where: {
            companyId,
            batchId: { in: ids },
            NOT: { sourceType: "PRODUCTION_RECEIPT", sourceId: r.id },
          },
        })
      )
        throw new Error(
          "This cloth has later movements; reverse them before correcting the receipt",
        );
      await tx.productBatch.updateMany({
        where: { companyId, id: { in: ids } },
        data: { quantity: 0 },
      });
      await tx.stockMovement.createMany({
        data: r.batches.map((b) => ({
          companyId,
          productId: b.productId,
          batchId: b.id,
          type: "ADJUSTMENT" as const,
          quantity: new Decimal(b.initialQuantity.toString()).neg().toFixed(3),
          sourceType: "PRODUCTION_RECEIPT_REVERSAL",
          sourceId: id,
          reference: r.receiptNumber,
          notes: reason,
        })),
      });
      await tx.productionJob.update({
        where: { id: r.jobId },
        data: {
          consumedQuantity: { decrement: r.yarnConsumed },
          allocatedYarnCost: { decrement: r.yarnCost },
        },
      });
      await tx.productionReceipt.update({
        where: { id },
        data: { status: "REVERSED" },
      });
      await reversePosting(tx, companyId, "PRODUCTION_RECEIPT", id, reason);
    }
  });
}
export async function movePartyStock(
  companyId: string,
  input: {
    customerId: string;
    productId: string;
    quantity: unknown;
    direction: string;
    reference: string;
    notes?: string;
    requestId?: string;
  },
) {
  const requestId = input.requestId || crypto.randomUUID();
  const qty = quantity(input.quantity),
    ref = input.reference.trim();
  if (!ref)
    throw new Error("A unique receipt or delivery reference is required");
  if (!["IN", "OUT"].includes(input.direction))
    throw new Error("Choose receipt or delivery");
  return db.$transaction(async (tx) => {
    if (
      !(await tx.customer.findFirst({
        where: { id: input.customerId, companyId },
      })) ||
      !(await tx.product.findFirst({
        where: { id: input.productId, companyId },
      }))
    )
      throw new Error("Customer or product not found");
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${companyId + ":" + input.customerId + ":" + input.productId},0))`;
    const prior = await tx.partyStockEntry.findFirst({
      where: { id: requestId, companyId },
    });
    if (prior) return prior;
    const current = await tx.partyStockEntry.aggregate({
      where: {
        companyId,
        customerId: input.customerId,
        productId: input.productId,
      },
      _sum: { quantity: true },
    });
    if (
      input.direction === "OUT" &&
      qty.gt(current._sum.quantity?.toString() || 0)
    )
      throw new Error("Delivery exceeds this customer's stock held here");
    return tx.partyStockEntry.create({
      data: {
        id: requestId,
        companyId,
        customerId: input.customerId,
        productId: input.productId,
        quantity: (input.direction === "OUT" ? qty.neg() : qty).toFixed(3),
        reference: ref,
        notes: input.notes,
      },
    });
  });
}

/** Record physical thaan measurements without buying or manufacturing more cloth. */
export async function measureThaans(
  companyId: string,
  batchId: string,
  rawLengths: string,
  requestId: string,
) {
  const lengths = rawLengths
    .trim()
    .split(/[\s,;]+/)
    .map(quantity);
  if (!lengths.length || lengths.length > 500)
    throw new Error("Enter between 1 and 500 thaan lengths");
  const total = lengths.reduce((n, l) => n.plus(l), new Decimal(0));
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "ProductBatch" WHERE id=${batchId} AND "companyId"=${companyId} FOR UPDATE`;
    if (
      await tx.stockMovement.findFirst({
        where: {
          companyId,
          sourceType: "THAAN_MEASUREMENT",
          sourceId: requestId,
        },
      })
    )
      return;
    const batch = await tx.productBatch.findFirst({
      where: { id: batchId, companyId },
      include: { product: true },
    });
    if (!batch || batch.product.unit !== "METER")
      throw new Error("Choose a cloth lot measured in metres");
    if (Number(batch.purchasePrice) <= 0)
      throw new Error("Price this lot before measuring thaans");
    await reserveBatchStock(tx, {
      companyId,
      productId: batch.productId,
      batchId,
      quantity: total.toNumber(),
    });
    const pieces = lengths.map((length, i) => ({
      id: crypto.randomUUID(),
      companyId,
      productId: batch.productId,
      batchNumber: `${batch.batchNumber}/T-${requestId.slice(0, 8)}-${i + 1}`,
      quantity: length.toFixed(3),
      initialQuantity: length.toFixed(3),
      purchasePrice: batch.purchasePrice,
      salePrice: batch.salePrice,
      manufactureDate: batch.manufactureDate,
      expiryDate: batch.expiryDate,
      isThaan: true,
    }));
    await tx.productBatch.createMany({ data: pieces });
    await tx.stockMovement.createMany({
      data: [
        {
          companyId,
          productId: batch.productId,
          batchId: batch.id,
          type: "ADJUSTMENT" as const,
          quantity: total.neg().toFixed(3),
          sourceType: "THAAN_MEASUREMENT",
          sourceId: requestId,
          reference: batch.batchNumber,
          notes: "Metres allocated to individually measured thaans",
        },
        ...pieces.map((p) => ({
          companyId,
          productId: p.productId,
          batchId: p.id,
          type: "ADJUSTMENT" as const,
          quantity: p.quantity,
          sourceType: "THAAN_MEASUREMENT",
          sourceId: requestId,
          reference: batch.batchNumber,
          notes:
            "Measured thaan; stock quantity and value transferred from original lot",
        })),
      ],
    });
  });
}
export async function reverseThaanMeasurement(
  companyId: string,
  sourceId: string,
  reason: string,
) {
  if (reason.trim().length < 5) throw new Error("Enter a correction reason");
  return db.$transaction(async (tx) => {
    const movements = await tx.stockMovement.findMany({
      where: { companyId, sourceType: "THAAN_MEASUREMENT", sourceId },
    });
    if (!movements.length) throw new Error("Thaan measurement not found");
    const ids = [
      ...new Set(
        movements.map((m) => m.batchId).filter((id): id is string => !!id),
      ),
    ].sort();
    const current = await tx.$queryRaw<
      Array<{ id: string; quantity: Prisma.Decimal }>
    >(
      Prisma.sql`SELECT id,quantity FROM "ProductBatch" WHERE "companyId"=${companyId} AND id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`,
    );
    if (
      await tx.stockMovement.findFirst({
        where: {
          companyId,
          sourceType: "THAAN_MEASUREMENT_REVERSAL",
          sourceId,
        },
      })
    )
      throw new Error("This measurement has already been reversed");
    const parent = movements.filter((m) => m.quantity < 0),
      children = movements.filter((m) => m.quantity > 0);
    if (
      parent.length !== 1 ||
      !children.length ||
      !parent[0].batchId ||
      movements.some((m) => !m.batchId) ||
      current.length !== ids.length
    )
      throw new Error("Measurement batch is missing");
    const childIds = children.map((m) => m.batchId!);
    if (
      children.some(
        (m) =>
          !current.find((b) => b.id === m.batchId)?.quantity.equals(m.quantity),
      )
    )
      throw new Error(
        "This thaan has been used; correct later movements first",
      );
    if (
      await tx.stockMovement.findFirst({
        where: {
          companyId,
          batchId: { in: childIds },
          NOT: { sourceType: "THAAN_MEASUREMENT", sourceId },
        },
      })
    )
      throw new Error("This thaan has later movements; correct them first");
    await tx.productBatch.updateMany({
      where: { companyId, id: { in: childIds } },
      data: { quantity: 0 },
    });
    await tx.productBatch.update({
      where: { id: parent[0].batchId },
      data: { quantity: { increment: -parent[0].quantity } },
    });
    await tx.stockMovement.createMany({
      data: movements.map((m) => ({
        companyId,
        productId: m.productId,
        batchId: m.batchId,
        type: "ADJUSTMENT" as const,
        quantity: -m.quantity,
        sourceType: "THAAN_MEASUREMENT_REVERSAL",
        sourceId,
        reference: m.reference,
        notes: reason,
      })),
    });
  });
}
