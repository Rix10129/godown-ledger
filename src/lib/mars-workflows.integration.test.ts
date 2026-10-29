import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { db } from "./db";
import { setAuthorizationSessionResolverForTests } from "./authorization";
import {
  createCustomerOrder,
  issueProduction,
  receiveProduction,
  returnProductionYarn,
  payProductionUnit,
  reverseProduction,
  movePartyStock,
  validateOrderDelivery,
  measureThaans,
  reverseThaanMeasurement,
} from "./mars-workflows";
import { postStockAdjustment } from "./accounting/posting-service";
import { ledgerBalances } from "./accounting/ledger-report";
import { dumpCompanyBackup } from "./company-backup-data";
import {
  encryptBackup,
  decryptBackup,
  validateRestoredBackup,
} from "./company-backup";
const enabled = process.env.RUN_DATABASE_CONCURRENCY_TESTS === "1";
mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });
mock.module("next/navigation", {
  namedExports: {
    redirect: (url: string) => {
      throw Object.assign(new Error("redirect"), {
        digest: `NEXT_REDIRECT;push;${url};307;`,
      });
    },
  },
});
const form = (values: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
};
async function posted(operation: () => Promise<unknown>) {
  try {
    const result = await operation();
    throw new Error(JSON.stringify(result));
  } catch (e) {
    if (!(e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT"))
      throw e;
  }
}
test(
  "Mars workflows: metre wages, variable thaans, partial orders, duplicate guards and backups",
  { skip: !enabled },
  async (t) => {
    const suffix = crypto.randomUUID();
    const company = await db.company.create({
      data: { name: `Mars test ${suffix}` },
    });
    const companyId = company.id;
    const other = await db.company.create({
      data: { name: `Other Mars test ${suffix}` },
    });
    t.after(async () => {
      setAuthorizationSessionResolverForTests();
      await db.saleInvoiceItem.deleteMany({
        where: { invoice: { companyId } },
      });
      await db.productBatch.deleteMany({
        where: { companyId, productionReceiptId: { not: null } },
      });
      await db.productionReceipt.deleteMany({ where: { companyId } });
      await db.productionJob.deleteMany({ where: { companyId } });
      await db.productionPayment.deleteMany({ where: { companyId } });
      await db.productionUnit.deleteMany({ where: { companyId } });
      await db.customerOrder.deleteMany({ where: { companyId } });
      await db.partyStockEntry.deleteMany({ where: { companyId } });
      await db.auditLog.deleteMany({ where: { companyId } });
      await db.company.delete({ where: { id: companyId } });
      await db.company.delete({ where: { id: other.id } });
    });
    const user = await db.user.create({
      data: {
        companyId,
        name: "Owner",
        email: `${suffix}@example.test`,
        password: "test-only",
        role: "OWNER",
      },
    });
    setAuthorizationSessionResolverForTests(async () => ({
      user: { id: user.id, companyId, role: "OWNER" },
    }));
    const customer = await db.customer.create({
      data: { companyId, name: "Ali", type: "BUKRAM" },
    });
    const yarn = await db.product.create({
      data: {
        companyId,
        name: "Yarn / blue",
        unit: "BAG",
        purchasePrice: 20,
        salePrice: 50,
      },
    });
    const cloth = await db.product.create({
      data: {
        companyId,
        name: "Production cloth",
        unit: "METER",
        purchasePrice: 0,
        salePrice: 100,
      },
    });
    const lot = await db.productBatch.create({
      data: {
        companyId,
        productId: yarn.id,
        batchNumber: "YARN",
        quantity: 1000,
        initialQuantity: 1000,
        purchasePrice: 20,
        salePrice: 50,
      },
    });
    await db.stockMovement.create({
      data: {
        companyId,
        productId: yarn.id,
        batchId: lot.id,
        type: "ADJUSTMENT",
        quantity: 1000,
      },
    });
    await db.$transaction((tx) =>
      postStockAdjustment(tx, {
        companyId,
        sourceId: lot.id,
        number: lot.id,
        date: new Date(),
        amount: 20000,
        increase: true,
        opening: true,
      }),
    );
    const unit = await db.productionUnit.create({
      data: { companyId, name: "Weaving unit", wageRate: 40 },
    });
    let jobId = "",
      receiptId = "";
    await t.test(
      "yarn transfer, cloth receipt and wages preserve valuation",
      async () => {
        const requestId = crypto.randomUUID();
        const input = {
          unitId: unit.id,
          yarnBatchId: lot.id,
          clothProductId: cloth.id,
          quantity: 50,
          requestId,
        };
        const job = await issueProduction(companyId, input);
        jobId = job.id;
        assert.equal((await issueProduction(companyId, input)).id, job.id);
        assert.equal(
          (await db.productBatch.findUniqueOrThrow({ where: { id: lot.id } }))
            .quantity,
          950,
        );
        await assert.rejects(issueProduction(other.id, input), /Select/);
        const receiptInput = {
          jobId,
          meters: 320,
          yarnConsumed: 30,
          lengths: "20,100,200",
          salePrice: 100,
          requestId: crypto.randomUUID(),
        };
        const receipt = await receiveProduction(companyId, receiptInput);
        receiptId = receipt.id;
        assert.equal(
          (await receiveProduction(companyId, receiptInput)).id,
          receipt.id,
        );
        assert.equal(Number(receipt.wages), 12800);
        assert.equal(Number(receipt.yarnCost), 600);
        const pieces = await db.productBatch.findMany({
          where: { productionReceiptId: receipt.id },
          orderBy: { initialQuantity: "asc" },
        });
        assert.deepEqual(
          pieces.map((b) => Number(b.initialQuantity)),
          [20, 100, 200],
        );
        assert.ok(pieces.every((b) => b.isThaan));
        await returnProductionYarn(companyId, jobId, 20);
        assert.equal(
          (await db.productBatch.findUniqueOrThrow({ where: { id: lot.id } }))
            .quantity,
          970,
        );
        const ledger = await ledgerBalances(companyId);
        assert.equal(ledger.find((a) => a.code === "1250")?.net, 0);
        assert.equal(ledger.find((a) => a.code === "2000")?.net, -12800);
        await assert.rejects(
          receiveProduction(companyId, {
            ...receiptInput,
            requestId: undefined,
          }),
          /exceeds/,
        );
      },
    );
    await t.test(
      "production payments are bounded, retry-safe and reversible",
      async () => {
        const paymentInput = {
          unitId: unit.id,
          amount: 10000,
          paymentMode: "BANK",
          reference: "WAGE-001",
          requestId: crypto.randomUUID(),
        };
        const payment = await payProductionUnit(companyId, paymentInput);
        assert.equal(
          (await payProductionUnit(companyId, paymentInput)).id,
          payment.id,
        );
        await assert.rejects(
          payProductionUnit(companyId, {
            ...paymentInput,
            requestId: undefined,
            amount: 3000,
            reference: "WAGE-002",
          }),
          /exceeds/,
        );
        await assert.rejects(
          reverseProduction(
            companyId,
            receiptId,
            "receipt",
            "Incorrect metres",
          ),
          /payment/,
        );
        await reverseProduction(
          companyId,
          payment.id,
          "payment",
          "Incorrect payment",
        );
        await reverseProduction(
          companyId,
          receiptId,
          "receipt",
          "Incorrect cloth delivery",
        );
        assert.equal(
          await db.productBatch.count({
            where: { productionReceiptId: receiptId, quantity: { gt: 0 } },
          }),
          0,
        );
        const balances = await ledgerBalances(companyId);
        assert.equal(balances.find((a) => a.code === "2000")?.net, 0);
        assert.equal(balances.find((a) => a.code === "1250")?.net, 600);
        await receiveProduction(companyId, {
          jobId,
          meters: 320,
          yarnConsumed: 30,
          lengths: "20,100,200",
          salePrice: 100,
        });
      },
    );
    await t.test(
      "customer orders reduce only on posted deliveries and block excess and wrong tenants",
      async () => {
        const requestId = crypto.randomUUID();
        const order = await createCustomerOrder(
          companyId,
          customer.id,
          [
            { productId: yarn.id, quantity: 500 },
            { productId: cloth.id, quantity: 100 },
          ],
          undefined,
          requestId,
        );
        assert.equal(
          (
            await createCustomerOrder(
              companyId,
              customer.id,
              [{ productId: yarn.id, quantity: 500 }],
              undefined,
              requestId,
            )
          ).id,
          order.id,
        );
        const item = await db.customerOrderItem.findFirstOrThrow({
          where: { orderId: order.id, productId: yarn.id },
        });
        const { createInvoice, updateInvoice, reverseInvoice } =
          await import("@/app/(dashboard)/sales/actions");
        function delivery(qty: number) {
          return form({
            customerId: customer.id,
            paymentMode: "CREDIT",
            paidAmount: "0",
            linesJson: JSON.stringify([
              {
                productId: yarn.id,
                batchId: lot.id,
                quantity: qty,
                salePrice: 50,
                discount: 0,
                taxRate: 0,
                orderItemId: item.id,
              },
            ]),
          });
        }
        await posted(() => createInvoice(null, delivery(100)));
        await posted(() => createInvoice(null, delivery(50)));
        const delivered = await db.saleInvoiceItem.aggregate({
          where: { orderItemId: item.id, invoice: { status: "POSTED" } },
          _sum: { quantity: true },
        });
        assert.equal(Number(delivered._sum.quantity), 150);
        const failed = await createInvoice(null, delivery(351));
        assert.match(failed?.error || "", /remaining/);
        const wrong = {
          orderItemId: item.id,
          productId: cloth.id,
          quantity: 1,
        };
        await assert.rejects(
          db.$transaction((tx) =>
            validateOrderDelivery(tx, companyId, customer.id, [wrong]),
          ),
          /quality/,
        );
        await assert.rejects(
          db.$transaction((tx) =>
            validateOrderDelivery(tx, other.id, customer.id, [
              { ...wrong, productId: yarn.id },
            ]),
          ),
          /another customer/,
        );
        const invoice = await db.saleInvoice.findFirstOrThrow({
          where: { companyId, status: "POSTED" },
        });
        const change = delivery(1);
        change.set("id", invoice.id);
        assert.match(
          (await updateInvoice(null, change))?.error || "",
          /reversed and re-entered/,
        );
        await posted(() =>
          reverseInvoice(
            null,
            form({ id: invoice.id, reason: "Incorrect order delivery" }),
          ),
        );
        const after = await db.saleInvoiceItem.aggregate({
          where: { orderItemId: item.id, invoice: { status: "POSTED" } },
          _sum: { quantity: true },
        });
        assert.ok(Number(after._sum.quantity) < 150);
      },
    );
    await t.test(
      "concurrent references and party-stock withdrawals cannot double-post",
      async () => {
        const attempts = await Promise.allSettled(
          [1, 2].map(() =>
            db.customerPayment.create({
              data: {
                companyId,
                customerId: customer.id,
                amount: 10,
                paymentMode: "BANK",
                reference: " TXN-004 ",
                status: "POSTED",
              },
            }),
          ),
        );
        assert.equal(
          attempts.filter((r) => r.status === "fulfilled").length,
          1,
        );
        const payment = await db.customerPayment.findFirstOrThrow({
          where: { companyId, reference: " TXN-004 " },
        });
        await db.customerPayment.update({
          where: { id: payment.id },
          data: { status: "REVERSED" },
        });
        const count = await db.productBatch.count({ where: { companyId } });
        await movePartyStock(companyId, {
          customerId: customer.id,
          productId: yarn.id,
          quantity: 10,
          direction: "IN",
          reference: "PARTY-IN",
        });
        const withdrawals = await Promise.allSettled(
          ["A", "B"].map((reference) =>
            movePartyStock(companyId, {
              customerId: customer.id,
              productId: yarn.id,
              quantity: 7,
              direction: "OUT",
              reference,
            }),
          ),
        );
        assert.equal(
          withdrawals.filter((r) => r.status === "fulfilled").length,
          1,
        );
        assert.equal(
          await db.productBatch.count({ where: { companyId } }),
          count,
        );
      },
    );
    await t.test(
      "concurrent order deliveries stay within the ordered quantity",
      async () => {
        const order = await db.customerOrder.findFirstOrThrow({
          where: { companyId },
          include: { items: true },
        });
        const item = order.items.find((i) => i.productId === yarn.id)!;
        const { createInvoice } =
          await import("@/app/(dashboard)/sales/actions");
        const already = await db.saleInvoiceItem.aggregate({
          where: { orderItemId: item.id, invoice: { status: "POSTED" } },
          _sum: { quantity: true },
        });
        const remaining =
          Number(item.quantity) - Number(already._sum.quantity || 0);
        const qty = remaining - 10;
        const deliver = () =>
          createInvoice(
            null,
            form({
              customerId: customer.id,
              paymentMode: "CREDIT",
              paidAmount: "0",
              linesJson: JSON.stringify([
                {
                  productId: yarn.id,
                  batchId: lot.id,
                  quantity: qty,
                  salePrice: 50,
                  discount: 0,
                  taxRate: 0,
                  orderItemId: item.id,
                },
              ]),
            }),
          );
        const results = await Promise.allSettled([deliver(), deliver()]);
        assert.equal(
          results.filter(
            (r) =>
              r.status === "rejected" &&
              (r.reason as { digest?: string }).digest?.startsWith(
                "NEXT_REDIRECT",
              ),
          ).length,
          1,
        );
        const total = await db.saleInvoiceItem.aggregate({
          where: { orderItemId: item.id, invoice: { status: "POSTED" } },
          _sum: { quantity: true },
        });
        assert.equal(Number(total._sum.quantity), Number(item.quantity) - 10);
      },
    );
    await t.test(
      "bank identity distinguishes real cheques while exact duplicates fail",
      async () => {
        const { createPDCCheque } = await import("./pdc-service");
        const input = {
          type: "RECEIVABLE" as const,
          customerId: customer.id,
          chequeNumber: "CH-123",
          bankName: "HBL",
          chequeDate: new Date(),
          amount: 10,
        };
        await createPDCCheque(companyId, input);
        await assert.rejects(
          createPDCCheque(companyId, {
            ...input,
            bankName: " hbl ",
            chequeNumber: " ch-123 ",
          }),
          /already/,
        );
        await createPDCCheque(companyId, { ...input, bankName: "UBL" });
        assert.equal(await db.pDCCheque.count({ where: { companyId } }), 2);
      },
    );
    await t.test(
      "cashiers cannot invoke production or party-stock actions",
      async () => {
        const { issueYarn, partyMovement } =
          await import("@/app/(dashboard)/stock/actions");
        setAuthorizationSessionResolverForTests(async () => ({
          user: { id: user.id, companyId, role: "CASHIER" },
        }));
        try {
          assert.match(
            (await issueYarn(null, new FormData()))?.error || "",
            /permission/,
          );
          assert.match(
            (await partyMovement(null, new FormData()))?.error || "",
            /permission/,
          );
        } finally {
          setAuthorizationSessionResolverForTests(async () => ({
            user: { id: user.id, companyId, role: "OWNER" },
          }));
        }
      },
    );
    await t.test(
      "order corrections respect deliveries and wage edits preserve agreed jobs",
      async () => {
        const { amendOrderItem, updateUnit } =
          await import("@/app/(dashboard)/stock/actions");
        const item = await db.customerOrderItem.findFirstOrThrow({
          where: { order: { companyId }, productId: yarn.id },
        });
        assert.match(
          (
            await amendOrderItem(
              null,
              form({
                id: item.id,
                quantity: "1",
                reason: "Incorrect quantity",
              }),
            )
          )?.error || "",
          /already delivered/,
        );
        assert.ok(
          (
            await amendOrderItem(
              null,
              form({
                id: item.id,
                quantity: "600",
                reason: "Customer increased order",
              }),
            )
          )?.success,
        );
        assert.ok(
          (
            await updateUnit(
              null,
              form({ id: unit.id, name: "Weaving unit", wageRate: "45" }),
            )
          )?.success,
        );
        assert.equal(
          Number(
            (
              await db.productionUnit.findUniqueOrThrow({
                where: { id: unit.id },
              })
            ).wageRate,
          ),
          45,
        );
        assert.equal(
          Number(
            (await db.productionJob.findUniqueOrThrow({ where: { id: jobId } }))
              .wageRate,
          ),
          40,
        );
        assert.equal(
          await db.auditLog.count({
            where: { companyId, entity: "CustomerOrderItem" },
          }),
          1,
        );
      },
    );
    await t.test(
      "measuring existing cloth preserves metres and value and can be corrected",
      async () => {
        const lot = await db.productBatch.findFirstOrThrow({
          where: { companyId, productId: cloth.id, quantity: { gt: 0 } },
          orderBy: { quantity: "asc" },
        });
        const before = await db.productBatch.findMany({
          where: { companyId, productId: cloth.id },
        });
        const total = (rows: typeof before) =>
          rows.reduce((n, b) => n + b.quantity, 0);
        const value = (rows: typeof before) =>
          rows.reduce((n, b) => n + b.quantity * Number(b.purchasePrice), 0);
        const journalCount = await db.journalEntry.count({
          where: { companyId },
        });
        const requestId = crypto.randomUUID();
        await measureThaans(companyId, lot.id, "5,15", requestId);
        await measureThaans(companyId, lot.id, "5,15", requestId);
        const after = await db.productBatch.findMany({
          where: { companyId, productId: cloth.id },
        });
        assert.equal(total(after), total(before));
        assert.ok(Math.abs(value(after) - value(before)) < 0.00001);
        assert.equal(
          await db.journalEntry.count({ where: { companyId } }),
          journalCount,
        );
        await assert.rejects(
          measureThaans(other.id, lot.id, "1", crypto.randomUUID()),
          /cloth lot/,
        );
        await reverseThaanMeasurement(
          companyId,
          requestId,
          "Wrong length measurements",
        );
        assert.equal(
          (await db.productBatch.findUniqueOrThrow({ where: { id: lot.id } }))
            .quantity,
          lot.quantity,
        );
        await assert.rejects(
          reverseThaanMeasurement(companyId, requestId, "Duplicate correction"),
          /already/,
        );
      },
    );
    await t.test(
      "duplicate receipts return an inline form error and keep one posting",
      async () => {
        const { recordPayment } =
          await import("@/app/(dashboard)/customers/actions");
        const f = form({
          customerId: customer.id,
          amount: "10",
          paymentMode: "BANK",
          paymentDate: new Date().toISOString(),
          reference: "FORM-DUPLICATE",
        });
        await posted(() => recordPayment(null, f));
        const before = await db.journalEntry.count({ where: { companyId } });
        const result = await recordPayment(null, f);
        assert.match(result?.error || "", /already been recorded/);
        assert.doesNotMatch(result?.error || "", /prisma/);
        assert.equal(
          await db.customerPayment.count({
            where: { companyId, reference: "FORM-DUPLICATE" },
          }),
          1,
        );
        assert.equal(
          await db.journalEntry.count({ where: { companyId } }),
          before,
        );
      },
    );
    await t.test(
      "backup contains every new workflow and remains encrypted and verifiable",
      async () => {
        const plain = await dumpCompanyBackup(companyId);
        const decoded = decryptBackup(
          encryptBackup(plain, "local-integration-backup-key"),
          "local-integration-backup-key",
        );
        assert.equal(decoded.manifest.schemaVersion, 4);
        assert.equal(decoded.data.customerOrders.length, 1);
        assert.equal(decoded.data.productionUnits.length, 1);
        assert.equal(decoded.data.productionReceipts.length, 2);
        assert.equal(decoded.data.partyStockEntries.length, 2);
        const result = validateRestoredBackup(decoded);
        assert.equal(result.ok, true, JSON.stringify(result.errors));
      },
    );
  },
);
