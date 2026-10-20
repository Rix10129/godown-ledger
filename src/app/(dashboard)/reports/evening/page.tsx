import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { eveningCloseText, type EveningLine } from "@/lib/evening-close"

export const dynamic = "force-dynamic"
export const metadata = { title: "Evening close" }

function dayBounds(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

export default async function EveningClosePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) redirect("/login")

  const { start, end } = dayBounds()
  const [company, purchases, invoices, receipts, millPayments, batches, entries] = await Promise.all([
    db.company.findUnique({ where: { id: companyId }, select: { name: true, address: true } }),
    db.purchaseOrder.findMany({
      where: { companyId, status: "POSTED", orderDate: { gte: start, lt: end } },
      include: { supplier: { select: { name: true } }, items: { include: { product: { select: { name: true, unit: true } } } } },
    }),
    db.saleInvoice.findMany({
      where: { companyId, status: "POSTED", invoiceDate: { gte: start, lt: end } },
      include: { customer: { select: { name: true } }, items: { include: { product: { select: { name: true, unit: true } } } } },
    }),
    db.customerPayment.findMany({
      where: { companyId, status: "POSTED", paymentDate: { gte: start, lt: end } },
      include: { customer: { select: { name: true } } },
    }),
    db.supplierPayment.findMany({
      where: { companyId, status: "POSTED", isVoided: false, paymentDate: { gte: start, lt: end } },
      include: { supplier: { select: { name: true } } },
    }),
    db.productBatch.findMany({
      where: { companyId, quantity: { gt: 0 } },
      include: { product: { select: { unit: true } } },
    }),
    db.journalEntry.findMany({
      where: { companyId, status: "POSTED" },
      select: { lines: { select: { debitAccountId: true, creditAccountId: true, amount: true } } },
    }),
  ])

  const money = (value: { toString(): string } | number) => formatCurrency(value.toString())
  const purchasesLines: EveningLine[] = purchases.flatMap((order) =>
    order.items.map((item) => ({
      label: `${item.product.name} ${item.quantity} ${item.product.unit.toLowerCase()}`,
      detail: `${order.supplier.name} · ${money(item.totalAmount)}`,
    })),
  )
  const salesLines: EveningLine[] = invoices.map((invoice) => ({
    label: `${invoice.invoiceNumber} ${invoice.customer?.name ?? invoice.walkInCustomerName ?? "Buyer"}`,
    detail: `${invoice.isCashSale ? "cash" : "udhar"} · ${invoice.items.map((item) => `${item.product.name} ${item.quantity} ${item.product.unit.toLowerCase()}`).join(", ")} · ${money(invoice.netAmount)}`,
  }))
  const recoveryLines: EveningLine[] = receipts.map((row) => ({
    label: row.customer.name,
    detail: money(row.amount),
  }))
  const paidLines: EveningLine[] = millPayments.map((row) => ({
    label: row.supplier.name,
    detail: money(row.amount),
  }))
  const stockByUnit = new Map<string, number>()
  for (const batch of batches) {
    const unit = batch.product.unit.toLowerCase()
    stockByUnit.set(unit, (stockByUnit.get(unit) ?? 0) + batch.quantity)
  }
  const stock = [...stockByUnit.entries()].map(([unit, qty]) => `${qty} ${unit}`).join(" · ")
  let debit = 0
  let credit = 0
  for (const entry of entries) {
    for (const line of entry.lines) {
      const amount = Number(line.amount.toString())
      if (line.debitAccountId) debit += amount
      if (line.creditAccountId) credit += amount
    }
  }
  const booksBalanced = entries.length > 0 && Math.abs(debit - credit) < 0.01
  const dateLabel = start.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })
  const text = eveningCloseText({
    firm: company?.name ?? "Godown Ledger",
    place: company?.address ?? "",
    dateLabel,
    purchases: purchasesLines,
    sales: salesLines,
    recovery: recoveryLines,
    paidToMills: paidLines,
    stock,
    booksBalanced,
  })
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(text)}`

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/reports" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ChevronLeft className="h-4 w-4" /> Reports
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900">Evening close</h1>
      <p className="mt-1 text-sm text-slate-500">What the godown did today. Send it to the owner. Nothing is posted by this page.</p>
      <pre className="mt-6 whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-5 font-mono text-sm leading-6 text-slate-800">{text}</pre>
      <div className="mt-4 flex flex-wrap gap-3">
        <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white">
          Send on WhatsApp
        </a>
      </div>
    </div>
  )
}
