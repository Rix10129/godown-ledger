import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { db } from "./db";

let session: {
  user: { id: string; companyId: string; role: string; name: string };
} | null = null;
mock.module("next-auth", {
  namedExports: { getServerSession: async () => session },
});
mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });
mock.module("next/navigation", {
  namedExports: {
    redirect: (url: string) => {
      throw new Error(`redirect:${url}`);
    },
  },
});
const form = (values: Record<string, string>) => {
  const f = new FormData();
  for (const [key, value] of Object.entries(values)) f.set(key, value);
  return f;
};

test(
  "unpriced batch and bag receipts wait for pricing without changing stock or accounts",
  { skip: process.env.RUN_DATABASE_CONCURRENCY_TESTS !== "1" },
  async () => {
    const company = await db.company.create({
      data: { name: "Mars receipt regression" },
    });
    const companyId = company.id;
    try {
      const user = await db.user.create({
        data: {
          companyId,
          name: "Owner",
          email: `${companyId}@example.test`,
          password: "test-only",
          role: "OWNER",
        },
      });
      session = {
        user: { id: user.id, companyId, name: user.name, role: "OWNER" },
      };
      const supplier = await db.supplier.create({
        data: { companyId, name: "Mill" },
      });
      const bag = await db.product.create({
        data: {
          companyId,
          supplierId: supplier.id,
          name: "Yarn bags",
          unit: "BAG",
          purchasePrice: 0,
          salePrice: 0,
        },
      });
      const cloth = await db.product.create({
        data: {
          companyId,
          name: "Cloth",
          unit: "METER",
          purchasePrice: 0,
          salePrice: 0,
        },
      });
      const { createBatch } =
        await import("@/app/(dashboard)/inventory/actions");
      const { receiveCloth, priceReceipt } =
        await import("@/app/(dashboard)/mills/actions");
      await assert.rejects(
        () =>
          createBatch(
            bag.id,
            null,
            form({
              batchNumber: "B-1",
              quantity: "12",
              purchasePrice: "",
              salePrice: "",
              manufactureDate: "2026-11-01",
              expiryDate: "2027-11-01",
            }),
          ),
        /redirect:\/receipts/,
      );
      const receipt = await db.purchaseOrder.findFirstOrThrow({
        where: { companyId },
        include: { items: true },
      });
      assert.equal(receipt.status, "DRAFT");
      assert.equal(receipt.items[0].quantity, 12);
      assert.equal(await db.productBatch.count({ where: { companyId } }), 0);
      assert.equal(await db.stockMovement.count({ where: { companyId } }), 0);
      assert.equal(await db.journalEntry.count({ where: { companyId } }), 0);
      const partial = await createBatch(
        bag.id,
        null,
        form({ batchNumber: "PARTIAL", quantity: "1", purchasePrice: "10" }),
      );
      assert.match(partial?.error ?? "", /both prices/);
      assert.equal(
        (
          await receiveCloth(
            null,
            form({
              supplierId: supplier.id,
              productId: cloth.id,
              lot: "C-1",
              quantity: "1",
              receiptKind: "bags",
            }),
          )
        ).error,
        "Select a product with the BAG stock unit.",
      );
      assert.deepEqual(
        await receiveCloth(
          null,
          form({
            supplierId: supplier.id,
            productId: bag.id,
            lot: "B-2",
            quantity: "3",
            receiptKind: "bags",
          }),
        ),
        { ok: true },
      );
      assert.deepEqual(
        await priceReceipt(
          null,
          form({ id: receipt.id, rate: "20", saleRate: "30" }),
        ),
        { ok: true },
      );
      assert.equal(
        (
          await db.productBatch.findFirstOrThrow({
            where: { companyId, batchNumber: "B-1" },
          })
        ).quantity,
        12,
      );
      const pricedBatch = await db.productBatch.findFirstOrThrow({
        where: { companyId, batchNumber: "B-1" },
      });
      assert.equal(
        pricedBatch.manufactureDate?.toISOString().slice(0, 10),
        "2026-11-01",
      );
      assert.equal(
        pricedBatch.expiryDate?.toISOString().slice(0, 10),
        "2027-11-01",
      );
      assert.equal(await db.stockMovement.count({ where: { companyId } }), 1);
      assert.equal(await db.journalEntry.count({ where: { companyId } }), 1);
      assert.ok(
        (
          await priceReceipt(
            null,
            form({ id: receipt.id, rate: "20", saleRate: "30" }),
          )
        ).error,
      );
      assert.equal(await db.stockMovement.count({ where: { companyId } }), 1);
      session.user.role = "CASHIER";
      assert.deepEqual(
        await receiveCloth(
          null,
          form({
            supplierId: supplier.id,
            productId: bag.id,
            lot: "B-3",
            quantity: "3",
            receiptKind: "bags",
          }),
        ),
        { error: "Forbidden" },
      );
    } finally {
      session = null;
      await db.purchaseOrderItem.deleteMany({
        where: { purchaseOrder: { companyId } },
      });
      await db.purchaseOrder.deleteMany({ where: { companyId } });
      await db.stockMovement.deleteMany({ where: { companyId } });
      await db.productBatch.deleteMany({ where: { companyId } });
      await db.company.delete({ where: { id: companyId } });
    }
  },
);

test(
  "owner receives the first bag product at purchase cost, with retry safety and selling rate deferred",
  { skip: process.env.RUN_DATABASE_CONCURRENCY_TESTS !== "1" },
  async () => {
    const company = await db.company.create({
      data: { name: "Receipt purchase cost regression" },
    });
    const companyId = company.id;
    try {
      const user = await db.user.create({
        data: {
          companyId,
          name: "Owner",
          email: `${companyId}@example.test`,
          password: "test-only",
          role: "OWNER",
        },
      });
      session = {
        user: { id: user.id, companyId, name: user.name, role: "OWNER" },
      };
      const supplier = await db.supplier.create({
        data: { companyId, name: "Sitara" },
      });
      const { receiveCloth, priceReceipt } =
        await import("@/app/(dashboard)/mills/actions");
      const key = crypto.randomUUID();
      const values = {
        requestKey: key,
        supplierId: supplier.id,
        productName: "20/s Cotton",
        receiptKind: "bags",
        lot: "COTTON-1",
        quantity: "1000",
        purchaseRate: "42.75",
      };
      for (const purchaseRate of ["0", "-2", "1.234", "NaN", "Infinity"]) {
        assert.ok(
          (await receiveCloth(null, form({ ...values, purchaseRate }))).error,
        );
      }
      assert.equal(await db.product.count({ where: { companyId } }), 0);
      const saved = await Promise.all([
        receiveCloth(null, form(values)),
        receiveCloth(null, form(values)),
      ]);
      assert.deepEqual(saved, [{ ok: true }, { ok: true }]);
      const product = await db.product.findFirstOrThrow({
        where: { companyId },
      });
      assert.equal(product.name, "20/s Cotton");
      assert.equal(product.unit, "BAG");
      assert.equal(await db.product.count({ where: { companyId } }), 1);
      const receipt = await db.purchaseOrder.findUniqueOrThrow({
        where: { id: key },
        include: { items: true },
      });
      assert.equal(receipt.status, "POSTED");
      assert.equal(receipt.netAmount.toString(), "42750");
      assert.equal(receipt.items[0].purchasePrice.toString(), "42.75");
      const batch = await db.productBatch.findUniqueOrThrow({
        where: { id: receipt.items[0].batchId! },
      });
      assert.equal(batch.quantity, 1000);
      assert.equal(
        batch.salePrice.toString(),
        "0",
        "Selling rate is entered on the bill, never copied from cost",
      );
      assert.equal(await db.stockMovement.count({ where: { companyId } }), 1);
      const journal = await db.journalEntry.findFirstOrThrow({
        where: { companyId },
        include: { lines: true },
      });
      assert.equal(
        journal.lines
          .filter((l) => l.debitAccountId)
          .reduce((n, l) => n + Number(l.amount), 0),
        42750,
      );
      assert.equal(
        journal.lines
          .filter((l) => l.creditAccountId)
          .reduce((n, l) => n + Number(l.amount), 0),
        42750,
      );
      assert.ok(
        (
          await receiveCloth(
            null,
            form({
              ...values,
              requestKey: crypto.randomUUID(),
              productName: "20/S COTTON",
            }),
          )
        ).error,
      );
      // Existing cloth can be priced later using purchase cost alone.
      const cloth = await db.product.create({
        data: {
          companyId,
          name: "Cloth",
          unit: "METER",
          purchasePrice: 0,
          salePrice: 0,
        },
      });
      const clothKey = crypto.randomUUID();
      assert.deepEqual(
        await receiveCloth(
          null,
          form({
            requestKey: clothKey,
            supplierId: supplier.id,
            productId: cloth.id,
            receiptKind: "cloth",
            lot: "C-2",
            quantity: "12.5",
          }),
        ),
        { ok: true },
      );
      assert.deepEqual(
        await priceReceipt(null, form({ id: clothKey, rate: "80.25" })),
        { ok: true },
      );
      const priced = await db.purchaseOrder.findUniqueOrThrow({
        where: { id: clothKey },
      });
      assert.equal(priced.netAmount.toString(), "1003.13");
      session.user.role = "STOREKEEPER";
      assert.ok(
        (
          await receiveCloth(
            null,
            form({
              ...values,
              requestKey: crypto.randomUUID(),
              productId: product.id,
            }),
          )
        ).error,
      );
      assert.ok(
        (
          await receiveCloth(
            null,
            form({
              ...values,
              requestKey: crypto.randomUUID(),
              purchaseRate: "",
              productName: "Forbidden product",
            }),
          )
        ).error,
      );
      // A storekeeper can still record physical receipts against an existing product.
      assert.deepEqual(
        await receiveCloth(
          null,
          form({
            supplierId: supplier.id,
            productId: product.id,
            lot: "KEEPER-1",
            quantity: "2",
            receiptKind: "bags",
          }),
        ),
        { ok: true },
      );
      assert.equal(await db.stockMovement.count({ where: { companyId } }), 2);
    } finally {
      session = null;
      await db.purchaseOrderItem.deleteMany({
        where: { purchaseOrder: { companyId } },
      });
      await db.purchaseOrder.deleteMany({ where: { companyId } });
      await db.stockMovement.deleteMany({ where: { companyId } });
      await db.productBatch.deleteMany({ where: { companyId } });
      await db.company.delete({ where: { id: companyId } });
    }
  },
);
