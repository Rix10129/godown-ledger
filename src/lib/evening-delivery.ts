export type DeliveryConfig = {
  resendKey?: string;
  from?: string;
  whatsappToken?: string;
  whatsappPhoneId?: string;
  whatsappVersion?: string;
  whatsappTemplate?: string;
  whatsappLanguage?: string;
};
export type DeliveryPayload = {
  id: string;
  channel: string;
  recipient: string;
  text: string;
  businessDate: string;
  attachment?: { filename: string; content: Uint8Array };
};
const FILE_ENVELOPE = "GODOWN_EVENING_FILE_V1\n";
/** Freeze the workbook with the outbox message so retries retain identical attachment bytes. */
export function freezeEveningFile(
  text: string,
  filename: string,
  content: Uint8Array,
): string {
  if (
    !/^[a-z0-9-]+\.xlsx$/i.test(filename) ||
    content.byteLength > 15 * 1024 * 1024
  )
    throw new Error("Invalid or oversized evening workbook");
  return (
    FILE_ENVELOPE +
    JSON.stringify({
      text,
      filename,
      base64: Buffer.from(content).toString("base64"),
    })
  );
}
export function thawEveningFile(payload: DeliveryPayload): DeliveryPayload {
  if (!payload.text.startsWith(FILE_ENVELOPE)) return payload;
  const value = JSON.parse(payload.text.slice(FILE_ENVELOPE.length)) as {
    text: string;
    filename: string;
    base64: string;
  };
  if (
    typeof value.text !== "string" ||
    typeof value.base64 !== "string" ||
    !/^[a-z0-9-]+\.xlsx$/i.test(value.filename)
  )
    throw new Error("Invalid stored evening workbook");
  return {
    ...payload,
    text: value.text,
    attachment: {
      filename: value.filename,
      content: new Uint8Array(Buffer.from(value.base64, "base64")),
    },
  };
}
/** Transport has no database side effects and accepts a fake fetch for contract tests. */
export async function deliverEvening(
  payload: DeliveryPayload,
  config: DeliveryConfig,
  request: typeof fetch = fetch,
): Promise<string> {
  payload = thawEveningFile(payload);
  if (payload.channel === "EMAIL") {
    if (!config.resendKey || !config.from)
      throw new Error("Email delivery is not configured");
    const response = await request("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `godown-evening/${payload.id}`,
      },
      body: JSON.stringify({
        from: config.from,
        to: [payload.recipient],
        subject: `Evening note · ${payload.businessDate}`,
        text: payload.text,
        ...(payload.attachment
          ? {
              attachments: [
                {
                  filename: payload.attachment.filename,
                  content: Buffer.from(payload.attachment.content).toString(
                    "base64",
                  ),
                },
              ],
            }
          : {}),
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok)
      throw new Error(
        `Email provider rejected the report (${response.status})`,
      );
    const result = (await response.json()) as { id?: string };
    if (!result.id)
      throw new Error("Email provider did not confirm acceptance");
    return result.id;
  }
  if (
    payload.channel !== "WHATSAPP" ||
    !config.whatsappToken ||
    !config.whatsappPhoneId ||
    !/^v\d+\.0$/.test(config.whatsappVersion ?? "") ||
    !config.whatsappTemplate
  )
    throw new Error("WhatsApp delivery is not configured");
  if (
    !/^\d{8,15}$/.test(payload.recipient) ||
    !/^\d+$/.test(config.whatsappPhoneId)
  )
    throw new Error("Invalid WhatsApp destination or phone identifier");
  if (payload.attachment)
    throw new Error("Use manual WhatsApp sharing for Excel attachments");
  const response = await request(
    `https://graph.facebook.com/${config.whatsappVersion}/${config.whatsappPhoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.whatsappToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: payload.recipient,
        type: "template",
        template: {
          name: config.whatsappTemplate,
          language: { code: config.whatsappLanguage ?? "en" },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: payload.text.slice(0, 1000) }],
            },
          ],
        },
      }),
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!response.ok)
    throw new Error(
      `WhatsApp provider rejected the report (${response.status})`,
    );
  const result = (await response.json()) as { messages?: { id: string }[] };
  if (!result.messages?.[0]?.id)
    throw new Error("WhatsApp provider did not confirm acceptance");
  return result.messages[0].id;
}
