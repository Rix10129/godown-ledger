import assert from "node:assert/strict"
import test from "node:test"
import { directDealSides } from "./direct-deal"

test("a direct deal bills the buyer and the mill and never touches stock", () => {
  const sides = directDealSides({ sale: "6500", cost: "6000", buyerPays: "CREDIT", millPays: "CHEQUE" })
  assert.deepEqual(sides.debits.map((leg) => leg.account), ["ACCOUNTS_RECEIVABLE", "COGS"])
  assert.deepEqual(sides.credits.map((leg) => leg.account), ["SALES", "CHEQUES_PAYABLE"])
  assert.equal(sides.debits.some((leg) => leg.account === "INVENTORY"), false)
  assert.equal(sides.credits.some((leg) => leg.account === "INVENTORY"), false)
  assert.equal(sides.margin.toFixed(2), "500.00")
  const debit = sides.debits.reduce((sum, leg) => sum + Number(leg.amount), 0)
  const credit = sides.credits.reduce((sum, leg) => sum + Number(leg.amount), 0)
  assert.equal(debit, credit)
})

test("a direct deal refuses a missing price", () => {
  assert.throws(() => directDealSides({ sale: 0, cost: 10, buyerPays: "CASH", millPays: "CASH" }), /selling price/)
})
