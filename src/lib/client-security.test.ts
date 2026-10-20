import test from "node:test";
import assert from "node:assert/strict";
import { canAccessPath, homeForRole } from "./desk-access";
import { validQuantity } from "./quantities";
import { businessDayBounds, businessDate } from "./business-time";
import { calculateDocumentTotals } from "./invoice-math";
import { deliverEvening } from "./evening-delivery";

test("keepers cannot access financial pages, exports or staff administration", () => {
  for (const path of [
    "/accounts",
    "/reports",
    "/reports/evening",
    "/api/export",
    "/api/reports/stock/export",
    "/inventory",
    "/people",
    "/customers",
  ])
    assert.equal(canAccessPath("STOREKEEPER", path), false, path);
  assert.equal(canAccessPath("STOREKEEPER", "/godown"), true);
  assert.equal(canAccessPath("STOREKEEPER", "/mills"), true);
  assert.equal(homeForRole("STOREKEEPER"), "/godown");
});
test("salesmen can bill and recover; only owner manages people", () => {
  assert.equal(canAccessPath("SALESMAN", "/sales/new"), true);
  assert.equal(canAccessPath("SALESMAN", "/reports/recovery"), true);
  assert.equal(canAccessPath("SALESMAN", "/reports/pl"), false);
  assert.equal(canAccessPath("ACCOUNTANT", "/people"), false);
  assert.equal(canAccessPath("OWNER", "/people"), true);
  assert.equal(canAccessPath("OWNER", "/sales/offline"), false);
});
test("stock input accepts thousandths and rejects nonfinite, negative and excess precision", () => {
  for (const q of [12.5, 18.75, 0.001, 1.234])
    assert.equal(validQuantity(q), true);
  for (const q of [0, -1, NaN, Infinity, 1.0001, 1e11])
    assert.equal(validQuantity(q), false);
});
test("Pakistan close uses the local date across the UTC day boundary", () => {
  assert.equal(businessDate(new Date("2026-10-20T20:00:00Z")), "2026-10-21");
  const { start, end } = businessDayBounds("2026-10-21");
  assert.equal(start.toISOString(), "2026-10-20T19:00:00.000Z");
  assert.equal(end.toISOString(), "2026-10-21T19:00:00.000Z");
  assert.throws(() => businessDayBounds("2026-02-30"));
});
test("fractional invoices round half-up to paisas and reject manufactured totals", () => {
  assert.deepEqual(
    calculateDocumentTotals(
      [{ quantity: 12.5, discount: 0, taxRate: 0 }],
      () => 0.29,
      0,
    ),
    { totalAmount: 3.63, taxAmount: 0, netAmount: 3.63 },
  );
  assert.throws(() =>
    calculateDocumentTotals(
      [{ quantity: 1, discount: -1, taxRate: 0 }],
      () => 100,
      0,
    ),
  );
  assert.throws(() =>
    calculateDocumentTotals(
      [{ quantity: 1, discount: 0, taxRate: 0 }],
      () => 100,
      101,
    ),
  );
});
test("email delivery requires provider acceptance and sends an idempotency key", async () => {
  let calls = 0;
  const fake = (async (url: unknown, options: RequestInit) => {
    calls++;
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(
      (options.headers as Record<string, string>)["Idempotency-Key"],
      "godown-evening/test-delivery",
    );
    return new Response(JSON.stringify({ id: "accepted" }), { status: 200 });
  }) as typeof fetch;
  const payload = {
    id: "test-delivery",
    channel: "EMAIL",
    recipient: "owner@example.test",
    text: "Test only",
    businessDate: "2026-10-20",
  };
  await assert.rejects(
    () => deliverEvening(payload, {}, fake),
    /not configured/,
  );
  assert.equal(calls, 0);
  assert.equal(
    await deliverEvening(
      payload,
      { resendKey: "test-only", from: "test@example.test" },
      fake,
    ),
    "accepted",
  );
  await assert.rejects(
    () =>
      deliverEvening(
        payload,
        { resendKey: "test-only", from: "test@example.test" },
        (async () => new Response("", { status: 429 })) as typeof fetch,
      ),
    /429/,
  );
});
test("WhatsApp uses an approved template, and does not report a rejected send as delivered", async () => {
  const config = {
    whatsappToken: "test-only",
    whatsappPhoneId: "1234567890",
    whatsappVersion: "v25.0",
    whatsappTemplate: "evening_note",
  };
  const payload = {
    id: "test",
    channel: "WHATSAPP",
    recipient: "923001234567",
    text: "Test summary",
    businessDate: "2026-10-20",
  };
  const fake = (async (_url: unknown, options: RequestInit) => {
    const body = JSON.parse(String(options.body));
    assert.equal(body.type, "template");
    assert.equal(body.template.name, "evening_note");
    return new Response(JSON.stringify({ messages: [{ id: "accepted" }] }), {
      status: 200,
    });
  }) as typeof fetch;
  assert.equal(await deliverEvening(payload, config, fake), "accepted");
  await assert.rejects(
    () =>
      deliverEvening(
        payload,
        config,
        (async () => new Response("", { status: 403 })) as typeof fetch,
      ),
    /403/,
  );
});
