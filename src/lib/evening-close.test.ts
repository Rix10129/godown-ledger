import assert from "node:assert/strict"
import test from "node:test"
import { eveningCloseText } from "./evening-close"

test("the evening close names the day, the cloth, and whether the books balance", () => {
  const text = eveningCloseText({
    firm: "Al-Noor Textile",
    place: "Multan",
    dateLabel: "20 Oct 2026",
    purchases: [{ label: "30s carded 20 kg", detail: "Crescent · Rs 9,800" }],
    sales: [{ label: "SAL-1006 Baba Cloth House", detail: "udhar · Rs 63,000" }],
    recovery: [],
    paidToMills: [],
    stock: "810 kg · 54 thaan",
    booksBalanced: true,
  })
  assert.match(text, /Al-Noor Textile/)
  assert.match(text, /Evening close · 20 Oct 2026/)
  assert.match(text, /30s carded 20 kg/)
  assert.match(text, /Recovery/)
  assert.match(text, /• None\./)
  assert.match(text, /Stock left: 810 kg · 54 thaan/)
  assert.match(text, /Books: balanced/)
})
