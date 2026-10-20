export type EveningLine = { label: string; detail?: string }

export type EveningClose = {
  firm: string
  place: string
  dateLabel: string
  purchases: EveningLine[]
  sales: EveningLine[]
  recovery: EveningLine[]
  paidToMills: EveningLine[]
  stock: string
  booksBalanced: boolean
}

function section(title: string, lines: EveningLine[]) {
  const body = lines.length ? lines.map((line) => `• ${line.label}${line.detail ? ` · ${line.detail}` : ""}`) : ["• None."]
  return [title, ...body, ""]
}

/** Plain-text evening close. The owner pastes it into WhatsApp. No stock is touched here. */
export function eveningCloseText(close: EveningClose) {
  return [
    close.firm,
    close.place ? close.place : "",
    `Evening close · ${close.dateLabel}`,
    "",
    ...section("Bought into the godown", close.purchases),
    ...section("Sold", close.sales),
    ...section("Recovery", close.recovery),
    ...section("Paid to mills", close.paidToMills),
    `Stock left: ${close.stock || "empty"}`,
    `Books: ${close.booksBalanced ? "balanced" : "OUT OF BALANCE"}`,
    "",
    "Godown Ledger",
  ].filter((line, index, all) => !(line === "" && all[index - 1] === "")).join("\n")
}
