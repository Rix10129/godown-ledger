"use client";

import { canAccessPath } from "@/lib/desk-access";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Building2,
  BookOpen,
  BarChart3,
  Settings,
  Factory,
  Bell,
  UserCog,
  FileText,
  Receipt,
  AlertTriangle,
  Target,
  LineChart,
  BarChart2,
  ClipboardList,
  MapPin,
  Quote,
  CalendarClock,
  WifiOff,
  Landmark,
  Moon,
  Menu,
  X,
} from "lucide-react";

const navSections = [
  {
    title: "Godown",
    items: [
      { href: "/godown", label: "Stock", icon: Package, alert: false },
      { href: "/mills", label: "Mills", icon: Factory, alert: false },
    ],
  },
  {
    title: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, alert: false },
      { href: "/alerts", label: "Alerts", icon: Bell, alert: true },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/inventory", label: "Inventory", icon: Package, alert: false },
      {
        href: "/inventory/reorder",
        label: "Reorder Sheet",
        icon: AlertTriangle,
        alert: false,
      },
      {
        href: "/inventory/adjustments/new",
        label: "Stock Adjustment",
        icon: ClipboardList,
        alert: false,
      },
      {
        href: "/receipts",
        label: "Price received cloth",
        icon: Package,
        alert: false,
      },
      {
        href: "/sales/direct",
        label: "Direct deals",
        icon: Truck,
        alert: false,
      },
      {
        href: "/reports/recovery",
        label: "Recovery",
        icon: Receipt,
        alert: false,
      },
      { href: "/sales", label: "Sales", icon: ShoppingCart, alert: false },
      { href: "/purchases", label: "Purchases", icon: Truck, alert: false },
      { href: "/expenses", label: "Expenses", icon: Receipt, alert: false },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/customers", label: "Buyers", icon: Users, alert: false },
      { href: "/suppliers", label: "Mills", icon: Building2, alert: false },
      {
        href: "/suppliers/schedule",
        label: "Pay Schedule",
        icon: CalendarClock,
        alert: false,
      },
    ],
  },
  {
    title: "Sales",
    items: [
      { href: "/quotations", label: "Quotations", icon: Quote, alert: false },
      { href: "/routes", label: "Routes", icon: MapPin, alert: false },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/accounts", label: "Accounts", icon: BookOpen, alert: false },
      {
        href: "/accounts/bank",
        label: "Bank Accounts",
        icon: Landmark,
        alert: false,
      },
      {
        href: "/accounts/pdc",
        label: "PDC Cheques",
        icon: FileText,
        alert: false,
      },
    ],
  },
  {
    title: "Analytics",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3, alert: false },
      {
        href: "/reports/evening",
        label: "Evening close",
        icon: Moon,
        alert: false,
      },
      {
        href: "/reports/targets",
        label: "Sales Targets",
        icon: Target,
        alert: false,
      },
      {
        href: "/reports/pl",
        label: "P&L Statement",
        icon: LineChart,
        alert: false,
      },
      {
        href: "/reports/balance-sheet",
        label: "Balance Sheet",
        icon: BarChart2,
        alert: false,
      },
    ],
  },
  {
    title: "More",
    items: [
      {
        href: "/people",
        label: "People and pins",
        icon: UserCog,
        alert: false,
        adminOnly: true,
      },
      { href: "/settings", label: "Settings", icon: Settings, alert: false },
    ],
  },
];

interface SidebarProps {
  alertCount?: number;
  role?: string;
  companyName?: string;
  logoUrl?: string | null;
}

export function Sidebar({
  alertCount = 0,
  role,
  companyName,
  logoUrl,
}: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isManager = role === "OWNER" || role === "ADMIN";

  // Find the single most-specific nav item that matches the current path.
  // Without this, a parent like "/inventory" would also highlight when
  // a child like "/inventory/adjustments/new" is active.
  const allItems = navSections.flatMap((s) => s.items);
  const activeHref = allItems.reduce((best, item) => {
    const matches =
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(item.href + "/");
    return matches && item.href.length > best.length ? item.href : best;
  }, "");

  return (
    <>
      <button
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-30 rounded border border-slate-300 bg-white p-2 md:hidden print:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      {mobileOpen && (
        <button
          aria-label="Close navigation overlay"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/60 md:hidden print:hidden"
        />
      )}
      <aside
        aria-label="Main navigation"
        className={`${mobileOpen ? "flex" : "hidden"} fixed inset-y-0 left-0 z-40 w-60 bg-slate-900 flex-col border-r border-slate-800 shrink-0 h-full md:static md:flex print:hidden`}
      >
        <button
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="absolute right-2 top-2 p-1 text-slate-300 md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
        {/* Logo */}
        <div className="px-4 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={companyName ?? "Logo"}
                className="w-8 h-8 rounded-lg object-contain bg-white/10 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                <Factory className="w-4 h-4 text-blue-400" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-tight truncate">
                {companyName ?? "Godown Ledger"}
              </p>
              <p className="text-[11px] text-slate-500 leading-tight">
                Mill-to-Market Trading
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="px-2 mb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items
                  .filter(
                    (item) =>
                      canAccessPath(role, item.href) &&
                      (item.href !== "/" || role === "OWNER") &&
                      (!(item as any).adminOnly || role === "OWNER"),
                  )
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = item.href === activeHref;
                    const badge = item.alert ? alertCount : 0;

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                            isActive
                              ? "bg-blue-600 text-white"
                              : "text-slate-400 hover:text-white hover:bg-slate-800",
                          )}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="flex-1 min-w-0 truncate">
                            {item.label}
                          </span>
                          {badge > 0 && (
                            <span className="shrink-0 min-w-[1.2rem] h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                              {badge > 99 ? "99+" : badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-slate-800">
          <p className="text-[11px] text-slate-600 text-center">
            Godown Ledger · v1.0
          </p>
        </div>
      </aside>
    </>
  );
}
