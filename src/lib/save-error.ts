/** Turn database duplicate guards into short messages usable on entry forms. */
export function saveError(error: unknown, fallback = "Could not save") {
  const e = error as { message?: string; code?: string };
  const message = e?.message || fallback;
  if (message.includes("payment reference has already been recorded"))
    return "This payment reference has already been recorded. Check the existing receipt before entering it again.";
  if (message.includes("cheque number has already been recorded"))
    return "This cheque number has already been recorded for this bank.";
  if (e?.code === "P2002") return "This name or reference is already in use.";
  return message;
}
