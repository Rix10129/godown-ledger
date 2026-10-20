import { db } from "@/lib/db";
import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessPath, homeForRole } from "@/lib/desk-access";

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.deskSessionId)
    return NextResponse.redirect(new URL("/login", req.url));
  const desk = await db.deskSession.findFirst({
    where: {
      id: token.deskSessionId,
      revoked: false,
      expiresAt: { gt: new Date() },
    },
  });
  if (!desk)
    return path.startsWith("/api/")
      ? NextResponse.json({ error: "Session expired" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", req.url));
  const mill = await db.user.findFirst({
    where: {
      id: desk.millUserId,
      isActive: true,
      role: "OWNER",
      company: { status: "ACTIVE" },
    },
    select: { companyId: true },
  });
  if (!mill) return NextResponse.redirect(new URL("/login", req.url));
  const actor = desk.personId
    ? await db.user.findFirst({
        where: { id: desk.personId, companyId: mill.companyId, isActive: true },
        select: { role: true },
      })
    : null;
  token.deskLocked = !actor;
  if (actor) token.role = actor.role;
  if (token.deskLocked && path !== "/desk" && !path.startsWith("/api/desk/")) {
    return path.startsWith("/api/")
      ? NextResponse.json(
          { error: "Open your desk with your PIN" },
          { status: 401 },
        )
      : NextResponse.redirect(new URL("/desk", req.url));
  }
  if (!token.deskLocked && !canAccessPath(token.role, path)) {
    return path.startsWith("/api/") || req.headers.has("next-action")
      ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
      : NextResponse.redirect(new URL(homeForRole(token.role), req.url));
  }
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  if (req.nextUrl.protocol === "https:")
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/((?!api/auth|api/admin|api/health|api/cron|_next/static|_next/image|login|register|forgot-password|reset-password|verify-email|favicon\\.ico|manifest.json|sw.js).*)",
  ],
};
