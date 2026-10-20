"use client";
import { useState } from "react";
import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { Bell, ChevronDown, LogOut } from "lucide-react";
import { LiveDeskUpdates } from "@/components/live-desk-updates";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
import { canAccessPath } from "@/lib/desk-access";
import { DESK_LABELS } from "@/lib/office-branding";
export function Topbar({
  session,
  alertCount = 0,
  dateLabel,
}: {
  session: Session;
  alertCount?: number;
  dateLabel: string;
}) {
  const [open, setOpen] = useState(false),
    [leaving, setLeaving] = useState(false);
  const user = session.user!;
  const initials = (user.name ?? "Office")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  return (
    <header className="office-topbar flex items-center justify-between gap-3 shrink-0 print:hidden">
      <div className="min-w-0">
        <p className="office-company-name truncate">{user.companyName}</p>
        <p className="office-company-date hidden sm:block">
          {dateLabel} · Pakistan
        </p>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-3">
        <LiveDeskUpdates />
        <button
          disabled={leaving}
          className="office-button-quiet shrink-0 !px-2.5 !text-xs sm:!px-4"
          onClick={async () => {
            setLeaving(true);
            try {
              localStorage.setItem("godown-desk-lock", String(Date.now()));
              const result = await signIn("credentials", {
                mode: "leave",
                redirect: false,
              });
              if (result?.ok) window.location.assign("/desk");
              else await signOut({ callbackUrl: "/login" });
            } catch {
              await signOut({ callbackUrl: "/login" });
            }
          }}
        >
          {leaving ? "Leaving…" : "Leave the desk"}
        </button>
        <DarkModeToggle />
        {canAccessPath(user.role, "/alerts") && (
          <Link
            href="/alerts"
            aria-label={alertCount ? `${alertCount} alerts` : "Alerts"}
            className="relative hidden rounded-md p-2 text-slate-600 hover:bg-slate-100 sm:inline-flex"
          >
            <Bell className="h-4 w-4" />
            {alertCount > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-amber-100 px-1.5 text-[10px] text-amber-800">
                {alertCount}
              </span>
            )}
          </Link>
        )}
        <div className="relative">
          <button
            aria-label="Open user menu"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 text-xs font-semibold text-blue-600">
              {initials}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-xs font-medium">{user.name}</span>
              <span className="block text-[10px] uppercase tracking-wider text-slate-500">
                {DESK_LABELS[user.role] ?? user.role}
              </span>
            </span>
            <ChevronDown className="hidden h-3 w-3 text-slate-500 sm:block" />
          </button>
          {open && (
            <>
              <button
                tabIndex={-1}
                aria-label="Close user menu"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setOpen(false)}
              />
              <div
                className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                }}
              >
                <div className="border-b border-slate-200 px-3 py-3">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {user.email}
                  </p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-2 rounded px-3 py-3 text-sm text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out of the office
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
