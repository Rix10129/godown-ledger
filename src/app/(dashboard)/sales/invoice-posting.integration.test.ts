import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { Client } from "pg";
import { db } from "@/lib/db";
import { setAuthorizationSessionResolverForTests } from "@/lib/authorization";
import {
  SYSTEM_ACCOUNTS,
  validateSystemAccounts,
} from "@/lib/accounting/system-accounts";

const runDatabaseTests = process.env.RUN_DATABASE_CONCURRENCY_TESTS === "1";

test(
  "posting a saved invoice tolerates database delays and remains atomic",
  {
    skip: runDatabaseTests
      ? false
      : "set RUN_DATABASE_CONCURRENCY_TESTS=1 against a test database",
  },
  async (t) => {
    mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });
    mock.module("next/navigation", {
      namedExports: {
        redirect: (url: string) => {
          throw Object.assign(new Error("NEXT_REDIRECT"), {
            digest: `NEXT_REDIRECT;push;${url};307;`,
          });
        },
      },
    });
    const { createInvoice } = await import("./actions");
    const company = await db.company.create({
      data: { name: `Posting timeout ${crypto.randomUUID()}` },
    });
    t.after(async () => {
      // Remove references before company cascades reach products and accounts.
      await db.saleInvoiceItem.deleteMany({
        where: { invoice: { companyId: company.id } },
      });
      await db.customerPayment.deleteMany({ where: { companyId: company.id } });
      await db.saleInvoice.deleteMany({ where: { companyId: company.id } });
      await db.journalLine.deleteMany({
        where: { journalEntry: { companyId: company.id } },
      });
      await db.journalEntry.deleteMany({ where: { companyId: company.id } });
      await db.company.delete({ where: { id: company.id } });
    });
    const user = await db.user.create({
      data: {
        companyId: company.id,
        name: "Posting test",
        email: `${crypto.randomUUID()}@example.test`,
        password: "not-used",
        role: "OWNER",
      },
    });
    const customer = await db.customer.create({
      data: { companyId: company.id, name: "Posting buyer" },
    });
    const product = await db.product.create({
      data: {
        companyId: company.id,
        name: "Posting product",
        salePrice: 100,
        purchasePrice: 80,
      },
    });
    const batch = await db.productBatch.create({
      data: {
        companyId: company.id,
        productId: product.id,
        batchNumber: "POSTING",
        quantity: 50,
        initialQuantity: 50,
        salePrice: 100,
        purchasePrice: 80,
      },
    });
    setAuthorizationSessionResolverForTests(async () => ({
      user: { id: user.id, companyId: company.id, role: "OWNER" },
    }));
    t.after(() => setAuthorizationSessionResolverForTests());

    function form(
      draftId: string,
      quantity: number,
      registeredCustomer = false,
    ) {
      const data = new FormData();
      data.set("draftId", draftId);
      data.set("paymentMode", "CASH");
      data.set("paidAmount", "100");
      if (registeredCustomer) data.set("customerId", customer.id);
      data.set(
        "linesJson",
        JSON.stringify([
          {
            productId: product.id,
            batchId: batch.id,
            quantity,
            salePrice: 100,
            discount: 0,
            taxRate: 0,
          },
        ]),
      );
      return data;
    }
    async function draft() {
      return db.invoiceDraft.create({
        data: { companyId: company.id, userId: user.id, data: {} },
      });
    }
    async function snapshot() {
      const where = { companyId: company.id };
      return {
        invoices: await db.saleInvoice.count({ where }),
        items: await db.saleInvoiceItem.count({ where: { invoice: where } }),
        receipts: await db.customerPayment.count({ where }),
        journals: await db.journalEntry.count({ where }),
        journalLines: await db.journalLine.count({
          where: { journalEntry: where },
        }),
        movements: await db.stockMovement.count({ where }),
        stock: (
          await db.productBatch.findUniqueOrThrow({ where: { id: batch.id } })
        ).quantity.toString(),
        sequences: await db.documentSequence.findMany({
          where,
          orderBy: { documentType: "asc" },
        }),
      };
    }

    await t.test(
      "missing accounting accounts are backfilled without replacing existing accounts",
      async () => {
        const existing = await db.account.create({
          data: {
            companyId: company.id,
            code: "1000",
            name: "Office cash",
            type: "ASSET",
            isSystem: true,
          },
        });
        const accounts = await db.$transaction((tx) =>
          validateSystemAccounts(tx, company.id),
        );
        assert.equal(
          Object.keys(accounts).length,
          Object.keys(SYSTEM_ACCOUNTS).length,
        );
        assert.equal(accounts.CASH.id, existing.id);
        assert.equal(accounts.CASH.name, "Office cash");
        await db.$transaction((tx) => validateSystemAccounts(tx, company.id));
        assert.equal(
          await db.account.count({ where: { companyId: company.id } }),
          Object.keys(SYSTEM_ACCOUNTS).length,
        );
      },
    );

    await t.test(
      "a salesperson cannot submit a manager credit-limit override",
      async () => {
        await db.customer.update({
          where: { id: customer.id },
          data: { creditLimit: 1 },
        });
        setAuthorizationSessionResolverForTests(async () => ({
          user: { id: user.id, companyId: company.id, role: "SALESMAN" },
        }));
        try {
          const saved = await draft();
          const before = await snapshot();
          const data = form(saved.id, 2, true);
          data.set("bypassCreditLimit", "1");
          const result = await createInvoice(null, data);
          assert.match(result?.error ?? "", /Credit limit exceeded/);
          assert.deepEqual(await snapshot(), before);
          assert.equal(
            await db.invoiceDraft.count({ where: { id: saved.id } }),
            1,
          );
        } finally {
          await db.customer.update({
            where: { id: customer.id },
            data: { creditLimit: 0 },
          });
          setAuthorizationSessionResolverForTests(async () => ({
            user: { id: user.id, companyId: company.id, role: "OWNER" },
          }));
        }
      },
    );

    await t.test(
      "draft consumption can wait longer than the old five-second limit",
      async () => {
        const saved = await draft();
        const locker = new Client({
          connectionString: process.env.DATABASE_URL,
        });
        await locker.connect();
        await locker.query("BEGIN");
        await locker.query(
          'SELECT id FROM "InvoiceDraft" WHERE id = $1 FOR UPDATE',
          [saved.id],
        );
        // Hold a real row lock so the final DELETE waits beyond Prisma's old limit.
        const release = new Promise<void>((resolve, reject) => {
          setTimeout(() => {
            locker.query("ROLLBACK").then(() => resolve(), reject);
          }, 6_500);
        });
        try {
          await assert.rejects(
            createInvoice(null, form(saved.id, 1)),
            (error: unknown) =>
              (error as { digest?: string }).digest?.startsWith(
                "NEXT_REDIRECT",
              ) === true,
          );
          await release;
        } finally {
          await release;
          await locker.end();
        }
        assert.equal(
          await db.invoiceDraft.count({ where: { id: saved.id } }),
          0,
        );
        assert.equal(
          await db.saleInvoice.count({ where: { companyId: company.id } }),
          1,
        );
        assert.equal(
          await db.stockMovement.count({ where: { companyId: company.id } }),
          1,
        );
        assert.equal(
          await db.journalEntry.count({ where: { companyId: company.id } }),
          1,
        );
        assert.equal((await snapshot()).stock, "49");
        const posted = await snapshot();
        const retry = await createInvoice(null, form(saved.id, 1));
        assert.match(retry?.error ?? "", /Draft not found or already posted/);
        assert.deepEqual(
          await snapshot(),
          posted,
          "resubmitting a consumed draft must not double-post",
        );
      },
    );

    await t.test(
      "stock failure rolls back invoice, receipt, journals and numbering while retaining the draft",
      async () => {
        const saved = await draft();
        const before = await snapshot();
        const result = await createInvoice(null, form(saved.id, 100, true));
        assert.match(result?.error ?? "", /Insufficient stock/);
        assert.deepEqual(await snapshot(), before);
        assert.equal(
          await db.invoiceDraft.count({ where: { id: saved.id } }),
          1,
        );
      },
    );
  },
);
