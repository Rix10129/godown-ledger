/** Shared by server Proxy and navigation. Route checks supplement action permissions. */
export function canAccessPath(
  role: string | undefined,
  pathname: string,
): boolean {
  if (pathname === "/sales/offline" || pathname === "/api/offline-data")
    return false;
  if (role === "OWNER") return true;
  if (!role) return false;
  if (
    pathname === "/api/health" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/desk/")
  )
    return true;
  if (
    pathname === "/" ||
    pathname === "/desk" ||
    pathname === "/user-guide.html"
  )
    return true;
  const prefix = (paths: string[]) =>
    paths.some((path) => pathname === path || pathname.startsWith(path + "/"));
  if (role === "STOREKEEPER") return prefix(["/godown", "/mills"]);
  if (role === "SALESMAN" || role === "CASHIER")
    return (
      prefix([
        "/sales",
        "/customers",
        "/recovery",
        "/reports/recovery",
        "/api/sync/sales",
        "/api/customers",
        "/api/reports/recovery/export",
        "/api/reports/aging/export",
      ]) && !prefix(["/sales/returns", "/sales/direct"])
    );
  if (role === "ACCOUNTANT")
    return (
      !prefix([
        "/users",
        "/settings",
        "/people",
        "/api/admin",
        "/api/backup",
        "/api/import",
      ]) && !pathname.startsWith("/api/cron/")
    );
  // Legacy admin is deliberately not equivalent to the owner in the client desk.
  return false;
}
export function homeForRole(role: string): string {
  if (role === "STOREKEEPER") return "/godown";
  if (role === "SALESMAN" || role === "CASHIER") return "/sales";
  if (role === "ACCOUNTANT") return "/reports/recovery";
  return "/";
}
