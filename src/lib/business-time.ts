export const BUSINESS_TIMEZONE = "Asia/Karachi";
export function businessDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function businessDayBounds(date = businessDate()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new Error("Use a date in YYYY-MM-DD format");
  const start = new Date(`${date}T00:00:00+05:00`);
  if (!Number.isFinite(start.getTime()) || businessDate(start) !== date)
    throw new Error("Invalid business date");
  return { start, end: new Date(start.getTime() + 86400000) };
}
