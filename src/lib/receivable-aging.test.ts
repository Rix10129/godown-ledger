import test from "node:test";
import assert from "node:assert/strict";
import {
  ageReceivable,
  overdueFirst,
  type AgingCustomer,
} from "./receivable-aging";
const now = new Date("2026-10-20T10:00:00Z");
const bill = (id: string, amount: number, date: string) => ({
  id,
  netAmount: amount,
  invoiceDate: new Date(date + "T00:00:00+05:00"),
  dueDate: null,
});
const customer = (parts: Partial<AgingCustomer>): AgingCustomer => ({
  id: "buyer",
  name: "Buyer",
  openingBalance: 0,
  invoices: [],
  payments: [],
  saleReturns: [],
  ...parts,
});
test("general recovery and original-bill returns reconcile fractional buyer dues", () => {
  const row = ageReceivable(
    customer({
      invoices: [bill("one", 412.5, "2026-10-20")],
      payments: [{ amount: 100 }],
      saleReturns: [{ invoiceId: "one", totalAmount: 75 }],
    }),
    now,
  );
  assert.equal(row.total, 237.5);
  assert.equal(row.b0_30, 237.5);
});
test("unallocated recovery pays the oldest open invoice before recent bills", () => {
  const row = ageReceivable(
    customer({
      invoices: [
        bill("new", 500, "2026-10-19"),
        bill("old", 200, "2026-06-01"),
      ],
      payments: [{ amount: 250, discountAmount: 10 }],
    }),
    now,
  );
  assert.equal(row.b90plus, 0);
  assert.equal(row.b0_30, 440);
  assert.equal(row.oldestDueDays, 1);
  assert.equal(row.invoiceCount, 1);
});
test("opening balances have unknown age and are not manufactured as 90-day debt", () => {
  const row = ageReceivable(
    customer({
      openingBalance: 100,
      invoices: [bill("new", 50, "2026-10-20")],
      payments: [{ amount: 60 }],
    }),
    now,
  );
  assert.equal(row.openingUnaged, 40);
  assert.equal(row.total, 90);
  assert.equal(row.b90plus, 0);
});
test("excess linked credits and negative openings reduce other open bills without negative buckets", () => {
  const row = ageReceivable(
    customer({
      openingBalance: -10,
      invoices: [bill("old", 100, "2026-06-01"), bill("new", 80, "2026-10-20")],
      payments: [{ invoiceId: "old", amount: 120 }],
    }),
    now,
  );
  assert.equal(row.total, 50);
  assert.equal(row.b0_30, 50);
  assert.equal(row.b90plus, 0);
});
test("overdue priority ranks an older small debt before a recent large one", () => {
  const old = ageReceivable(
      customer({ invoices: [bill("old", 10, "2026-06-01")] }),
      now,
    ),
    recent = ageReceivable(
      customer({ invoices: [bill("new", 1000, "2026-10-19")] }),
      now,
    );
  assert.deepEqual([recent, old].sort(overdueFirst), [old, recent]);
});
