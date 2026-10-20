import Decimal from "decimal.js";
import { businessDate, businessDayBounds } from "./business-time";
type Money = number | string | { toString(): string };
export type AgingCustomer = {
  id: string;
  name: string;
  area?: string | null;
  openingBalance: Money;
  invoices: {
    id: string;
    netAmount: Money;
    invoiceDate: Date;
    dueDate?: Date | null;
  }[];
  payments: {
    invoiceId?: string | null;
    amount: Money;
    discountAmount?: Money;
  }[];
  saleReturns: { invoiceId?: string | null; totalAmount: Money }[];
};
const money = (n: Money = 0) => new Decimal(n.toString());
/** Read-only aging allocation: linked credits first, then general credits FIFO. */
export function ageReceivable(customer: AgingCustomer, now = new Date()) {
  const today = businessDayBounds(businessDate(now)).start;
  const debts = customer.invoices.map((i) => ({
    id: i.id,
    amount: money(i.netAmount),
    date: i.invoiceDate,
    due: i.dueDate ?? i.invoiceDate,
  }));
  const byId = new Map(debts.map((d) => [d.id, d]));
  const opening = money(customer.openingBalance);
  let credits = opening.isNegative() ? opening.negated() : new Decimal(0);
  for (const payment of customer.payments) {
    const amount = money(payment.amount).plus(money(payment.discountAmount));
    const debt = payment.invoiceId ? byId.get(payment.invoiceId) : undefined;
    if (debt) debt.amount = debt.amount.minus(amount);
    else credits = credits.plus(amount);
  }
  for (const returned of customer.saleReturns) {
    const amount = money(returned.totalAmount),
      debt = returned.invoiceId ? byId.get(returned.invoiceId) : undefined;
    if (debt) debt.amount = debt.amount.minus(amount);
    else credits = credits.plus(amount);
  }
  for (const debt of debts)
    if (debt.amount.isNegative()) {
      credits = credits.minus(debt.amount);
      debt.amount = new Decimal(0);
    }
  let openingLeft = Decimal.max(0, opening);
  const openingCredit = Decimal.min(credits, openingLeft);
  openingLeft = openingLeft.minus(openingCredit);
  credits = credits.minus(openingCredit);
  debts.sort(
    (a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id),
  );
  const buckets = {
    b0_30: new Decimal(0),
    b31_60: new Decimal(0),
    b61_90: new Decimal(0),
    b90plus: new Decimal(0),
  };
  let invoiceCount = 0,
    oldestDueDays = -1;
  for (const debt of debts) {
    const applied = Decimal.min(credits, debt.amount);
    debt.amount = debt.amount.minus(applied);
    credits = credits.minus(applied);
    if (debt.amount.lte(0)) continue;
    invoiceCount++;
    const age = Math.max(
      0,
      Math.floor(
        (today.getTime() -
          businessDayBounds(businessDate(debt.due)).start.getTime()) /
          86400000,
      ),
    );
    oldestDueDays = Math.max(oldestDueDays, age);
    const bucket =
      age <= 30
        ? "b0_30"
        : age <= 60
          ? "b31_60"
          : age <= 90
            ? "b61_90"
            : "b90plus";
    buckets[bucket] = buckets[bucket].plus(debt.amount);
  }
  const number = (n: Decimal) => n.toDecimalPlaces(2).toNumber();
  const total = Object.values(buckets).reduce(
    (s, value) => s.plus(value),
    openingLeft,
  );
  return {
    id: customer.id,
    name: customer.name,
    area: customer.area ?? null,
    invoiceCount,
    oldestDueDays,
    b0_30: number(buckets.b0_30),
    b31_60: number(buckets.b31_60),
    b61_90: number(buckets.b61_90),
    b90plus: number(buckets.b90plus),
    openingUnaged: number(openingLeft),
    total: number(total),
  };
}
export function overdueFirst<
  T extends { oldestDueDays: number; total: number },
>(a: T, b: T) {
  return b.oldestDueDays - a.oldestDueDays || b.total - a.total;
}
