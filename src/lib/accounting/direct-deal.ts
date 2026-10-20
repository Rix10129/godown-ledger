import Decimal from "decimal.js"

export type DirectPay = "CASH" | "BANK" | "CHEQUE" | "CREDIT"
export type DirectLeg = { account: string; amount: Decimal }

function money(value: Decimal.Value) {
  return new Decimal(value).toDecimalPlaces(2)
}

function accountFor(mode: DirectPay, direction: "in" | "out") {
  if (mode === "CREDIT") return direction === "in" ? "ACCOUNTS_RECEIVABLE" : "ACCOUNTS_PAYABLE"
  if (mode === "BANK") return "BANK"
  if (mode === "CHEQUE") return direction === "in" ? "CHEQUES_RECEIVABLE" : "CHEQUES_PAYABLE"
  return "CASH"
}

/**
 * A direct deal never enters the godown. The buyer is charged, the mill is
 * credited, and stock is not debited or credited. The two pairs balance on
 * their own: sale against the buyer, cost against the mill.
 */
export function directDealSides(input: { sale: Decimal.Value; cost: Decimal.Value; buyerPays: DirectPay; millPays: DirectPay }) {
  const sale = money(input.sale)
  const cost = money(input.cost)
  if (sale.lte(0) || cost.lte(0)) throw new Error("A direct deal needs a cost and a selling price")
  const debits: DirectLeg[] = [
    { account: accountFor(input.buyerPays, "in"), amount: sale },
    { account: "COGS", amount: cost },
  ]
  const credits: DirectLeg[] = [
    { account: "SALES", amount: sale },
    { account: accountFor(input.millPays, "out"), amount: cost },
  ]
  const debit = debits.reduce((sum, leg) => sum.plus(leg.amount), new Decimal(0))
  const credit = credits.reduce((sum, leg) => sum.plus(leg.amount), new Decimal(0))
  if (!debit.equals(credit)) throw new Error(`Direct deal does not balance: ${debit.toFixed(2)} vs ${credit.toFixed(2)}`)
  return { debits, credits, margin: sale.minus(cost) }
}
