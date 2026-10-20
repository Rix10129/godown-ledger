import test from "node:test";
import assert from "node:assert/strict";
import {
  deliverEvening,
  freezeEveningFile,
  thawEveningFile,
} from "./evening-delivery";
import { eveningFilename } from "./evening-workbook";
const content = new Uint8Array([80, 75, 3, 4, 10, 20]);
const payload = {
  id: "qa-document",
  channel: "EMAIL",
  recipient: "owner@example.test",
  businessDate: "2026-10-20",
  text: freezeEveningFile(
    "Frozen note",
    "Mars-Textile-evening-2026-10-20.xlsx",
    content,
  ),
};
test("email retry reuses the frozen workbook bytes and provider idempotency key", async () => {
  const calls: string[] = [];
  const fake = (async (_url: unknown, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    assert.equal(body.text, "Frozen note");
    assert.equal(
      body.attachments[0].content,
      Buffer.from(content).toString("base64"),
    );
    assert.equal(
      (init.headers as Record<string, string>)["Idempotency-Key"],
      "godown-evening/qa-document",
    );
    calls.push(String(init.body));
    return new Response(JSON.stringify({ id: "accepted" }));
  }) as typeof fetch;
  await deliverEvening(
    payload,
    { resendKey: "test", from: "qa@example.test" },
    fake,
  );
  await deliverEvening(
    { ...payload },
    { resendKey: "test", from: "qa@example.test" },
    fake,
  );
  assert.equal(calls[0], calls[1]);
  assert.deepEqual(thawEveningFile(payload).attachment?.content, content);
});
test("scheduled WhatsApp remains text-only and refuses an unsupported Excel template send", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      deliverEvening(
        { ...payload, channel: "WHATSAPP", recipient: "923001234567" },
        {
          whatsappToken: "test",
          whatsappPhoneId: "12345678",
          whatsappVersion: "v25.0",
          whatsappTemplate: "qa_text_template",
        },
        (async () => {
          calls++;
          return new Response("{}");
        }) as typeof fetch,
      ),
    /manual WhatsApp sharing/,
  );
  assert.equal(calls, 0);
});
test("filenames cannot inject response headers or attachment paths", () => {
  const filename = eveningFilename(
    "../../Mars\r\nX-Header: injection",
    "2026-10-20",
  );
  assert.match(filename, /^[a-z0-9-]+\.xlsx$/i);
  assert.throws(() => freezeEveningFile("note", "../../secret.xlsx", content));
});
