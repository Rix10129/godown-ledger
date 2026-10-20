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
};
/** Transport has no database side effects and accepts a fake fetch for contract tests. */
export async function deliverEvening(
  payload: DeliveryPayload,
  config: DeliveryConfig,
  request: typeof fetch = fetch,
): Promise<string> {
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
