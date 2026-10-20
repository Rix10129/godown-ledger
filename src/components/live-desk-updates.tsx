"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
/** Refresh read screens from the shared database; never replace an unfinished entry. */
export function LiveDeskUpdates() {
  const router = useRouter(),
    pathname = usePathname();
  const dirty = useRef(false);
  const [online, setOnline] = useState(true);
  const [, startTransition] = useTransition();
  useEffect(() => {
    dirty.current = false;
    const editRoute =
      /\/(new|edit)(\/|$)/.test(pathname) ||
      ["/people", "/settings", "/sales/direct", "/receipts"].includes(pathname);
    const changed = () => {
      dirty.current = true;
    };
    const refresh = () => {
      if (
        editRoute ||
        dirty.current ||
        document.visibilityState !== "visible" ||
        !navigator.onLine
      )
        return;
      const tag = document.activeElement?.tagName;
      if (tag && ["INPUT", "SELECT", "TEXTAREA"].includes(tag)) return;
      startTransition(() => router.refresh());
    };
    const saved = () => {
      dirty.current = false;
      refresh();
    };
    window.addEventListener("godown-entry-saved", saved);
    const connection = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) refresh();
    };
    setOnline(navigator.onLine);
    document.addEventListener("input", changed);
    document.addEventListener("change", changed);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    const interval = window.setInterval(refresh, 5000);
    return () => {
      window.removeEventListener("godown-entry-saved", saved);
      window.clearInterval(interval);
      document.removeEventListener("input", changed);
      document.removeEventListener("change", changed);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
    };
  }, [pathname, router]);
  return (
    <span
      className={`hidden lg:inline text-xs ${online ? "text-slate-500" : "text-amber-700"}`}
    >
      {online ? "Shared office book" : "Reconnect to update the book"}
    </span>
  );
}
