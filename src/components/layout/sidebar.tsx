"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { canAccessPath } from "@/lib/desk-access";
import { DESK_LABELS } from "@/lib/office-branding";
import { WovenMark } from "@/components/office-design";

const groups = [
  {
    id: "day",
    title: "Day book",
    items: [
      { href: "/", label: "Overview" },
      { href: "/alerts", label: "Alerts", alerts: true },
    ],
  },
  {
    id: "godown",
    title: "Godown & mills",
    items: [
      { href: "/godown", label: "Godown stock" },
      { href: "/mills", label: "Mills" },
      { href: "/inventory", label: "Cloth products & lots" },
      { href: "/receipts", label: "Price received cloth" },
      { href: "/inventory/reorder", label: "Reorder sheet" },
      { href: "/inventory/adjustments/new", label: "Stock adjustment" },
    ],
  },
  {
    id: "sales",
    title: "Bills & recovery",
    items: [
      { href: "/sales", label: "Sales bills" },
      { href: "/reports/recovery", label: "Recovery" },
      { href: "/customers", label: "Buyers" },
      { href: "/sales/direct", label: "Direct deals" },
      { href: "/sales/returns", label: "Buyer returns" },
      { href: "/quotations", label: "Quotations" },
      { href: "/routes", label: "Routes" },
    ],
  },
  {
    id: "books",
    title: "Books & accounts",
    items: [
      { href: "/accounts", label: "Accounts & ledger" },
      { href: "/accounts/bank", label: "Bank accounts" },
      { href: "/accounts/pdc", label: "PDC cheques" },
      { href: "/purchases", label: "Purchases" },
      { href: "/suppliers", label: "Mill accounts" },
      { href: "/suppliers/schedule", label: "Mill pay schedule" },
      { href: "/expenses", label: "Expenses" },
    ],
  },
  {
    id: "reports",
    title: "Evening & reports",
    items: [
      { href: "/reports/evening", label: "Evening note" },
      { href: "/reports", label: "All reports" },
      { href: "/reports/pl", label: "Profit & loss" },
      { href: "/reports/balance-sheet", label: "Balance sheet" },
      { href: "/reports/targets", label: "Sales targets" },
    ],
  },
  {
    id: "more",
    title: "More",
    items: [
      { href: "/people", label: "People and pins" },
      { href: "/settings", label: "Settings & office file" },
      { href: "/user-guide.html", label: "Office guide" },
    ],
  },
];

export function Sidebar({
  alertCount = 0,
  role,
  companyName,
  logoUrl,
}: {
  alertCount?: number;
  role?: string;
  companyName?: string;
  logoUrl?: string | null;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<string>();
  const navigation = useRef<HTMLElement>(null);
  const visible = groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          canAccessPath(role, item.href) &&
          (item.href !== "/" || role === "OWNER"),
      ),
    }))
    .filter((group) => group.items.length);
  const activeHref = visible
    .flatMap((g) => g.items)
    .reduce((best, item) => {
      const match =
        item.href === "/"
          ? pathname === "/"
          : pathname === item.href || pathname.startsWith(item.href + "/");
      return match && item.href.length > best.length ? item.href : best;
    }, "");
  const activeGroup = visible.find((g) =>
    g.items.some((item) => item.href === activeHref),
  )?.id;
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        navigation.current?.querySelectorAll<HTMLElement>(
          "a[href],button:not([disabled])",
        ) ?? [],
      ).filter((el) => el.getClientRects().length);
    focusable()[0]?.focus();
    const keydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
      if (e.key === "Tab") {
        const list = focusable(),
          first = list[0],
          last = list.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [mobileOpen]);
  const navigate = () => {
    setMobileOpen(false);
    setExpanded(undefined);
  };
  return (
    <>
      <button
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
        aria-controls="office-navigation"
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-4 z-30 rounded-md border border-slate-300 bg-white p-2 text-blue-600 md:hidden print:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      {mobileOpen && (
        <button
          tabIndex={-1}
          aria-label="Close navigation overlay"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 md:hidden print:hidden"
        />
      )}
      <aside
        id="office-navigation"
        ref={navigation}
        aria-label="Main navigation"
        className={`office-sidebar ${mobileOpen ? "flex" : "hidden"} fixed inset-y-0 left-0 z-40 shrink-0 flex-col h-full md:static md:flex print:hidden`}
      >
        <button
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="absolute right-2 top-2 p-1 text-white md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="office-identity">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="h-11 w-11 rounded-lg object-contain"
            />
          ) : (
            <WovenMark />
          )}
          <div className="min-w-0">
            <strong className="truncate">
              {companyName ?? "Godown Ledger"}
            </strong>
            <small>The office book</small>
          </div>
        </div>
        <nav aria-label="Office sections">
          <p className="mb-4 px-3 text-[10px] uppercase tracking-[.18em] text-[#d2e2d6]">
            Your workspace
          </p>
          {visible.map((group) => {
            const active = activeGroup === group.id;
            const open = (expanded ?? activeGroup) === group.id;
            const code = String(
              groups.findIndex((g) => g.id === group.id) + 1,
            ).padStart(2, "0");
            return (
              <div key={group.id} className="office-nav-group">
                <div className={`office-nav-heading ${active ? "active" : ""}`}>
                  <Link href={group.items[0].href} onClick={navigate}>
                    <span>{code}</span>
                    {group.title}
                  </Link>
                  {group.items.length > 1 && (
                    <button
                      aria-label={`Expand ${group.title}`}
                      aria-expanded={open}
                      aria-controls={`nav-${group.id}`}
                      onClick={() => setExpanded(open ? "" : group.id)}
                    >
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                  )}
                </div>
                {open && group.items.length > 1 && (
                  <div id={`nav-${group.id}`} className="office-nav-children">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={navigate}
                        aria-current={
                          item.href === activeHref ? "page" : undefined
                        }
                      >
                        {item.label}
                        {"alerts" in item && alertCount > 0 && (
                          <span className="rounded bg-[#f6efd9] px-1.5 text-[10px] text-[#805513]">
                            {alertCount}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="office-nav-footer">
          <strong>{DESK_LABELS[role ?? ""] ?? "Personal"}’s desk</strong>
          <p>
            {role === "OWNER"
              ? "All office work available"
              : "Your work, in the shared office book"}
          </p>
          <p className="mt-1 text-[10px]">Godown Ledger · {companyName}</p>
        </div>
      </aside>
    </>
  );
}
