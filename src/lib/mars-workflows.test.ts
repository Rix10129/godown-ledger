import assert from "node:assert/strict";
import { test } from "node:test";
import { quantity, rate, thaanLengths } from "./mars-workflows";
import { productSchema, batchSchema } from "./validations/inventory";
test("catalogue prices may be unknown while received stock still needs real prices", () => {
  const p = productSchema.parse({ name: "Cotton cloth", unit: "METER" });
  assert.equal(p.purchasePrice, 0);
  assert.equal(p.salePrice, 0);
  assert.equal(
    productSchema.safeParse({
      name: "Cotton cloth",
      unit: "METER",
      salePrice: -1,
    }).success,
    false,
  );
  assert.equal(
    batchSchema.safeParse({ batchNumber: "LOT", quantity: 10 }).success,
    false,
  );
});
test("thaan lengths are individual measurements with an exact metre total", () => {
  assert.deepEqual(
    thaanLengths("20,100\n200", quantity(320)).map((n) => n.toNumber()),
    [20, 100, 200],
  );
  assert.throws(() => thaanLengths("20,100,200", quantity(300)), /add up/);
  for (const q of [0, -1, "NaN", "Infinity", 0.0001])
    assert.throws(() => quantity(q));
  assert.throws(() => rate(1.001));
});

import { saveError } from "./save-error";
test("duplicate database errors become short form messages", () => {
  const message = saveError(
    new Error(
      "Invalid prisma invocation: This payment reference has already been recorded",
    ),
  );
  assert.match(message, /Check the existing receipt/);
  assert.doesNotMatch(message, /prisma/);
});
