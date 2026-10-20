"use client";
import { SessionProvider, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { useEffect } from "react";
export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => null);
    const lock = (event: StorageEvent) => {
      if (event.key === "godown-desk-lock") window.location.replace("/desk");
    };
    window.addEventListener("storage", lock);
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", restore);
    return () => {
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("storage", lock);
    };
  }, []);
  return (
    <SessionProvider
      session={session}
      refetchOnWindowFocus
      refetchInterval={60}
    >
      <SessionWatcher />
      {children}
    </SessionProvider>
  );
}

function SessionWatcher() {
  const { data, status } = useSession();
  useEffect(() => {
    const pathname = window.location.pathname;
    const authPage = [
      "/login",
      "/desk",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
    ].includes(pathname);
    if (
      !authPage &&
      status !== "loading" &&
      (!data?.user || data?.desk?.locked)
    )
      window.location.replace(data?.desk ? "/desk" : "/login");
  }, [data, status]);
  return null;
}
