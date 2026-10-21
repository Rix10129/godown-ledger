import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { db } from "./db";
import { setAuthorizationSessionResolverForTests } from "./authorization";
import { ledgerBalances } from "./accounting/ledger-report";
import { assertStockReconciles } from "./inventory-reconciliation";
import ExcelJS from "exceljs";
import { buildEveningWorkbook } from "./evening-workbook";
import { buildEveningReport } from "./evening-report";

const enabled = process.env.RUN_DATABASE_CONCURRENCY_TESTS === "1";
const form = (values: Record<string, string>) => {
  const f = new FormData();
  for (const [key, value] of Object.entries(values)) f.set(key, value);
  return f;
};
async function posted(operation: () => Promise<unknown>) {
  try {
    const result = await operation();
    throw new Error(
      `Expected a posted document redirect; received ${JSON.stringify(result)}`,
    );
  } catch (error) {
    if (!(error as { digest?: string }).digest?.startsWith("NEXT_REDIRECT"))
      throw error;
  }
}

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
for (const stockUnit of ["BAG", "KG"] as const)
  test(
    `a ${stockUnit} textile workday reconciles stock, returns, direct trades and both ledgers`,
    {
      skip: enabled
        ? false
        : "requires an isolated migrated PostgreSQL test database",
    },
    async (t) => {
      const { createPurchase, createPurchaseReturn } =
        await import("@/app/(dashboard)/purchases/actions");
      const { createInvoice, createSaleReturn } =
        await import("@/app/(dashboard)/sales/actions");
      const { createDirect, cancelDirect } =
        await import("@/app/(dashboard)/sales/direct/actions");
      const suffix = crypto.randomUUID();
      const company = await db.company.create({
        data: { name: `Textile workday ${suffix}` },
      });
      const owner = await db.user.create({
        data: {
          companyId: company.id,
          name: "Test owner",
          email: `${suffix}@example.test`,
          password: "test-only",
          role: "OWNER",
        },
      });
      const mill = await db.supplier.create({
        data: { companyId: company.id, name: "Test mill" },
      });
      const buyer = await db.customer.create({
        data: { companyId: company.id, name: "Test buyer" },
      });
      const product = await db.product.create({
        data: {
          companyId: company.id,
          supplierId: mill.id,
          name: "40s combed",
          unit: stockUnit,
          purchasePrice: 100,
          salePrice: 150,
        },
      });
      setAuthorizationSessionResolverForTests(async () => ({
        user: {
          id: owner.id,
          companyId: company.id,
          role: "OWNER",
          name: owner.name,
        },
      }));
      t.after(async () => {
        setAuthorizationSessionResolverForTests();
        await db.saleReturnItem.deleteMany({
          where: { saleReturn: { companyId: company.id } },
        });
        await db.saleReturn.deleteMany({ where: { companyId: company.id } });
        await db.purchaseReturnItem.deleteMany({
          where: { purchaseReturn: { companyId: company.id } },
        });
        await db.purchaseReturn.deleteMany({
          where: { companyId: company.id },
        });
        await db.customerPayment.deleteMany({
          where: { companyId: company.id },
        });
        await db.supplierPayment.deleteMany({
          where: { companyId: company.id },
        });
        await db.saleInvoiceItem.deleteMany({
          where: { invoice: { companyId: company.id } },
        });
        await db.saleInvoice.deleteMany({ where: { companyId: company.id } });
        await db.purchaseOrderItem.deleteMany({
          where: { purchaseOrder: { companyId: company.id } },
        });
        await db.purchaseOrder.deleteMany({ where: { companyId: company.id } });
        await db.stockMovement.deleteMany({ where: { companyId: company.id } });
        await db.journalLine.deleteMany({
          where: { journalEntry: { companyId: company.id } },
        });
        await db.journalEntry.deleteMany({ where: { companyId: company.id } });
        await db.account.deleteMany({ where: { companyId: company.id } });
        await db.productBatch.deleteMany({ where: { companyId: company.id } });
        await db.product.deleteMany({ where: { companyId: company.id } });
        await db.auditLog.deleteMany({ where: { companyId: company.id } });
        await db.customer.deleteMany({ where: { companyId: company.id } });
        await db.supplier.deleteMany({ where: { companyId: company.id } });
        await db.user.deleteMany({ where: { companyId: company.id } });
        await db.company.delete({ where: { id: company.id } });
      });
      const purchaseForm = form({
        supplierId: mill.id,
        linesJson: JSON.stringify([
          {
            productId: product.id,
            batchNumber: suffix,
            expiryDate: "",
            manufactureDate: null,
            quantity: 12.5,
            purchasePrice: 100,
            salePrice: 150,
            discount: 0,
            taxRate: 0,
          },
        ]),
      });
      await posted(() => createPurchase(null, purchaseForm));
      const purchase = await db.purchaseOrder.findFirstOrThrow({
        where: { companyId: company.id },
      });
      const lot = await db.productBatch.findFirstOrThrow({
        where: { companyId: company.id },
      });
      assert.equal(lot.quantity, 12.5);
      assert.equal(lot.expiryDate, null);
      await posted(() =>
        createInvoice(
          null,
          form({
            customerId: buyer.id,
            paymentMode: "CREDIT",
            linesJson: JSON.stringify([
              {
                productId: product.id,
                batchId: lot.id,
                quantity: 2.75,
                salePrice: 150,
                discount: 0,
                taxRate: 0,
              },
            ]),
          }),
        ),
      );
      const invoice = await db.saleInvoice.findFirstOrThrow({
        where: { companyId: company.id },
      });
      let balances = await ledgerBalances(company.id);
      const net = (code: string) =>
        balances.find((a) => a.code === code)?.net ?? 0;
      assert.equal(net("1200"), 975);
      assert.equal(net("5000"), 275);
      assert.equal(net("1100"), 412.5);
      assert.equal(net("2000"), -1250);
      await posted(() =>
        createSaleReturn(
          null,
          form({
            invoiceId: invoice.id,
            customerId: buyer.id,
            linesJson: JSON.stringify([
              {
                productId: product.id,
                batchId: lot.id,
                quantity: 0.5,
                salePrice: 999999,
              },
            ]),
          }),
        ),
      );
      assert.equal(
        (await db.productBatch.findUniqueOrThrow({ where: { id: lot.id } }))
          .quantity,
        10.25,
      );
      const returned = await db.saleReturn.findFirstOrThrow({
        where: { companyId: company.id },
      });
      assert.equal(
        returned.totalAmount.toString(),
        "75",
        "server uses original invoice rate, never a client-supplied return rate",
      );
      const tooMuch = await createSaleReturn(
        null,
        form({
          invoiceId: invoice.id,
          linesJson: JSON.stringify([
            {
              productId: product.id,
              batchId: lot.id,
              quantity: 3,
              salePrice: 150,
            },
          ]),
        }),
      );
      assert.match(tooMuch?.error ?? "", /exceeds/);
      await posted(() =>
        createPurchaseReturn(
          null,
          form({
            purchaseOrderId: purchase.id,
            supplierId: mill.id,
            linesJson: JSON.stringify([
              {
                productId: product.id,
                batchId: lot.id,
                quantity: 1.25,
                purchasePrice: 999999,
              },
            ]),
          }),
        ),
      );
      assert.equal(
        (await db.productBatch.findUniqueOrThrow({ where: { id: lot.id } }))
          .quantity,
        9,
      );
      const directForm = form({
        key: crypto.randomUUID(),
        supplierId: mill.id,
        customerId: buyer.id,
        description: "Direct cloth",
        quantity: "10",
        unit: stockUnit,
        costRate: "80",
        saleRate: "100",
        buyerMode: "CREDIT",
        millMode: "CREDIT",
      });
      await posted(() => createDirect(null, directForm));
      await posted(() => createDirect(null, directForm));
      assert.equal(
        await db.saleInvoice.count({
          where: { companyId: company.id, directKey: { not: null } },
        }),
        1,
      );
      assert.equal(
        (await db.productBatch.findUniqueOrThrow({ where: { id: lot.id } }))
          .quantity,
        9,
        "direct deals never change stock",
      );
      balances = await ledgerBalances(company.id);
      assert.equal(net("1200"), 900);
      assert.equal(net("5000"), 1025);
      assert.equal(net("1100"), 1337.5);
      assert.equal(net("2000"), -1925);
      const direct = await db.saleInvoice.findFirstOrThrow({
        where: { companyId: company.id, directKey: { not: null } },
      });
      assert.deepEqual(
        await cancelDirect(
          null,
          form({ id: direct.id, reason: "Test reversal" }),
        ),
        {},
      );
      balances = await ledgerBalances(company.id);
      assert.equal(net("1200"), 900);
      assert.equal(net("5000"), 225);
      assert.equal(net("1100"), 337.5);
      assert.equal(net("2000"), -1125);
      // Two tills race to sell six kg from nine: only one may reserve it.
      const sellSix = () =>
        createInvoice(
          null,
          form({
            customerId: buyer.id,
            paymentMode: "CREDIT",
            linesJson: JSON.stringify([
              {
                productId: product.id,
                batchId: lot.id,
                quantity: 6,
                salePrice: 150,
                discount: 0,
                taxRate: 0,
              },
            ]),
          }),
        );
      const raced = await Promise.allSettled([sellSix(), sellSix()]);
      assert.equal(
        raced.filter(
          (r) =>
            r.status === "rejected" &&
            String((r.reason as { digest?: string }).digest).startsWith(
              "NEXT_REDIRECT",
            ),
        ).length,
        1,
      );
      assert.equal(
        (await db.productBatch.findUniqueOrThrow({ where: { id: lot.id } }))
          .quantity,
        3,
      );
      const batches = await db.productBatch.findMany({
          where: { companyId: company.id },
        }),
        movements = await db.stockMovement.findMany({
          where: { companyId: company.id },
        });
      assertStockReconciles(batches, movements, new Map([[product.id, 3]]));
      const report = await buildEveningReport(company.id);
      assert.equal(report.balanced, true);
      assert.equal(report.totals.stockValue, "300.00");
      // Discounts change the actual inventory unit cost; tax is excluded from inventory.
      await posted(() =>
        createPurchase(
          null,
          form({
            supplierId: mill.id,
            discountAmount: "12.50",
            linesJson: JSON.stringify([
              {
                productId: product.id,
                batchNumber: "tax-" + suffix,
                expiryDate: "",
                manufactureDate: null,
                quantity: 12.5,
                purchasePrice: 100,
                salePrice: 150,
                discount: 10,
                taxRate: 10,
              },
            ]),
          }),
        ),
      );
      const taxableLot = await db.productBatch.findFirstOrThrow({
        where: { companyId: company.id, batchNumber: "tax-" + suffix },
      });
      assert.equal(taxableLot.purchasePrice.toString(), "89");
      const taxablePurchase = await db.purchaseOrder.findFirstOrThrow({
        where: {
          companyId: company.id,
          items: { some: { batchId: taxableLot.id } },
        },
      });
      await posted(() =>
        createInvoice(
          null,
          form({
            customerId: buyer.id,
            paymentMode: "CREDIT",
            linesJson: JSON.stringify([
              {
                productId: product.id,
                batchId: taxableLot.id,
                quantity: 2.5,
                salePrice: 150,
                discount: 10,
                taxRate: 10,
              },
            ]),
          }),
        ),
      );
      const taxableInvoice = await db.saleInvoice.findFirstOrThrow({
        where: {
          companyId: company.id,
          items: { some: { batchId: taxableLot.id } },
        },
      });
      await posted(() =>
        createSaleReturn(
          null,
          form({
            invoiceId: taxableInvoice.id,
            linesJson: JSON.stringify([
              {
                productId: product.id,
                batchId: taxableLot.id,
                quantity: 0.5,
                salePrice: 1,
              },
            ]),
          }),
        ),
      );
      await posted(() =>
        createPurchaseReturn(
          null,
          form({
            purchaseOrderId: taxablePurchase.id,
            linesJson: JSON.stringify([
              {
                productId: product.id,
                batchId: taxableLot.id,
                quantity: 0.5,
                purchasePrice: 1,
              },
            ]),
          }),
        ),
      );
      balances = await ledgerBalances(company.id);
      assert.equal(net("1200"), 1190);
      assert.equal(net("5000"), 1003);
      assert.equal(net("1300"), 108);
      assert.equal(net("2100"), -27);
      const { createStockAdjustment } =
        await import("@/app/(dashboard)/inventory/adjustments/actions");
      for (const direction of ["add", "subtract"])
        await posted(() =>
          createStockAdjustment(
            null,
            form({
              productId: product.id,
              batchId: lot.id,
              direction,
              quantity: "0.125",
              notes: "Fractional stock count correction",
            }),
          ),
        );
      assert.equal((await buildEveningReport(company.id)).balanced, true);
      const finalNote = await buildEveningReport(company.id);
      assert.match(finalNote.text, /Returned by buyers/);
      assert.match(finalNote.text, /Returned to mills/);
      assert.equal(finalNote.totals.sales, "1534.50");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(
        new Uint8Array(
          await buildEveningWorkbook({
            ...finalNote,
            company: { ...finalNote.company, name: "=1+1" },
          }),
        ).buffer,
      );
      assert.equal(
        workbook.getWorksheet("Summary")!.getCell("A1").type,
        ExcelJS.ValueType.String,
      );
      assert.equal(
        workbook.getWorksheet("Summary")!.getCell("B7").value,
        1534.5,
      );
      assert.ok(workbook.getWorksheet("Purchases"));
      assert.ok(workbook.getWorksheet("Recovery"));
      assert.ok(workbook.getWorksheet("Buyer Dues"));
      assert.ok(workbook.getWorksheet("Waiting for Rate"));
      let exportedStockCost = 0;
      workbook.getWorksheet("Stock")!.eachRow((row, n) => {
        if (n > 5) exportedStockCost += Number(row.getCell(7).value);
      });
      assert.equal(exportedStockCost, Number(finalNote.totals.stockValue));
      assert.equal(
        workbook.getWorksheet("Stock")!.getCell("E6").value,
        stockUnit,
      );
      assert.match(finalNote.text, new RegExp(stockUnit));
      assert.equal(
        workbook.getWorksheet("Stock")!.getColumn(4).numFmt,
        "#,##0.000",
      );

      const { dumpCompanyBackup } = await import("./company-backup-data");
      const { encryptBackup, decryptBackup, validateRestoredBackup } =
        await import("./company-backup");
      const backup = await dumpCompanyBackup(company.id);
      const secret =
        process.env.BACKUP_ENCRYPTION_KEY ?? "integration-test-only-key";
      const encrypted = encryptBackup(backup, secret);
      assert.equal(
        validateRestoredBackup(
          decryptBackup(JSON.parse(JSON.stringify(encrypted)), secret),
        ).ok,
        true,
      );
      if (process.env.QA_BACKUP_FILE)
        (await import("node:fs")).writeFileSync(
          process.env.QA_BACKUP_FILE,
          JSON.stringify(encrypted),
          { mode: 0o600 },
        );
    },
  );
