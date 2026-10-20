import { db } from "@/lib/db";
import Decimal from "decimal.js";
/** Reversed originals AND their posted compensations are required for a correct net ledger. */
export async function ledgerBalances(
  companyId: string,
  range?: { gte?: Date; lt?: Date },
) {
  const entry = {
    companyId,
    status: { in: ["POSTED", "REVERSED"] as ("POSTED" | "REVERSED")[] },
    ...(range ? { entryDate: range } : {}),
  };
  const accounts = await db.account.findMany({
    where: { companyId },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      debitLines: { where: { journalEntry: entry }, select: { amount: true } },
      creditLines: { where: { journalEntry: entry }, select: { amount: true } },
    },
  });
  return accounts.map((a) => {
    const debit = a.debitLines.reduce(
      (s, l) => s.plus(l.amount.toString()),
      new Decimal(0),
    );
    const credit = a.creditLines.reduce(
      (s, l) => s.plus(l.amount.toString()),
      new Decimal(0),
    );
    return {
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      debit: debit.toNumber(),
      credit: credit.toNumber(),
      net: debit.minus(credit).toNumber(),
    };
  });
}
