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
