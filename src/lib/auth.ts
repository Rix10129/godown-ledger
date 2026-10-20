import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

const lifetime = 12 * 60 * 60;
async function openDesk(
  millUserId: string,
  personId: string | null,
  previousId?: string,
) {
  return db.$transaction(async (tx) => {
    if (previousId)
      await tx.deskSession.updateMany({
        where: { id: previousId },
        data: { revoked: true },
      });
    return tx.deskSession.create({
      data: {
        millUserId,
        personId,
        expiresAt: new Date(Date.now() + lifetime * 1000),
      },
    });
  });
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: lifetime },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Mill and desk",
      credentials: {
        email: { label: "Mill email", type: "email" },
        password: { label: "Mill password", type: "password" },
        mode: { type: "text" },
        personId: { type: "text" },
        pin: { type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials) return null;
        const mode = credentials.mode ?? "mill";
        if (mode === "pin" || mode === "leave" || mode === "setup") {
          const token = await getToken({
            req: new NextRequest(
              new URL(
                "/api/auth",
                process.env.NEXTAUTH_URL ?? "http://localhost:3000",
              ),
              { headers: req.headers as HeadersInit },
            ),
            secret: process.env.NEXTAUTH_SECRET,
          });
          if (!token?.deskSessionId || !token.millUserId) return null;
          const current = await db.deskSession.findFirst({
            where: {
              id: token.deskSessionId,
              millUserId: token.millUserId,
              revoked: false,
              expiresAt: { gt: new Date() },
            },
          });
          const mill = await db.user.findFirst({
            where: { id: token.millUserId, role: "OWNER", isActive: true },
            include: { company: true },
          });
          if (!current || !mill || mill.company.status !== "ACTIVE")
            return null;
          if (mode === "leave") {
            const desk = await openDesk(mill.id, null, current.id);
            return {
              id: mill.id,
              name: mill.name,
              email: mill.email,
              role: mill.role,
              companyId: mill.companyId,
              companyName: mill.company.name,
              millUserId: mill.id,
              deskSessionId: desk.id,
              deskLocked: true,
            };
          }
          if (!/^\d{4}$/.test(credentials.pin ?? "")) return null;
          let personId = credentials.personId;
          if (mode === "setup") {
            if (current.personId !== null || mill.pinHash) return null;
            const pinHash = await bcrypt.hash(credentials.pin, 12);
            const changed = await db.user.updateMany({
              where: { id: mill.id, pinHash: null },
              data: { pinHash, pinFailures: 0, pinLockedUntil: null },
            });
            if (changed.count !== 1) return null;
            personId = mill.id;
          }
          if (!personId) return null;
          // Serialize attempts for this person, so parallel requests cannot bypass the lockout.
          const person = await db.$transaction(
            async (tx) => {
              await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${personId} AND "companyId" = ${mill.companyId} FOR UPDATE`;
              const row = await tx.user.findFirst({
                where: {
                  id: personId,
                  companyId: mill.companyId,
                  isActive: true,
                },
              });
              if (
                !row?.pinHash ||
                (row.pinLockedUntil && row.pinLockedUntil > new Date())
              )
                return null;
              if (!(await bcrypt.compare(credentials.pin, row.pinHash))) {
                const failures = row.pinFailures + 1;
                await tx.user.update({
                  where: { id: row.id },
                  data: {
                    pinFailures: failures >= 5 ? 0 : failures,
                    pinLockedUntil:
                      failures >= 5 ? new Date(Date.now() + 15 * 60_000) : null,
                  },
                });
                return null;
              }
              await tx.user.update({
                where: { id: row.id },
                data: { pinFailures: 0, pinLockedUntil: null },
              });
              return row;
            },
            { timeout: 10000 },
          );
          if (!person) return null;
          const desk = await openDesk(mill.id, person.id, current.id);
          return {
            id: person.id,
            name: person.name,
            email: person.email,
            role: person.role,
            companyId: mill.companyId,
            companyName: mill.company.name,
            millUserId: mill.id,
            deskSessionId: desk.id,
            deskLocked: false,
          };
        }
        if (mode !== "mill" || !credentials.email || !credentials.password)
          return null;
        const email = credentials.email.toLowerCase().trim();
        const recentFailures = await db.failedLogin.count({
          where: {
            email,
            createdAt: { gte: new Date(Date.now() - 15 * 60_000) },
          },
        });
        if (recentFailures >= 5) return null;
        // Never choose an arbitrary tenant when the same owner email exists in two mills.
        const candidates = await db.user.findMany({
          where: { email, role: "OWNER", isActive: true, emailVerified: true },
          include: { company: true },
          take: 2,
        });
        if (
          candidates.length !== 1 ||
          !(await bcrypt.compare(credentials.password, candidates[0].password))
        ) {
          await db.failedLogin.create({ data: { email } });
          return null;
        }
        const mill = candidates[0];
        if (mill.company.status !== "ACTIVE")
          throw new Error(
            mill.company.status === "PENDING"
              ? "PENDING_APPROVAL"
              : "SUSPENDED",
          );
        await db.failedLogin.deleteMany({ where: { email } });
        const desk = await openDesk(mill.id, null);
        return {
          id: mill.id,
          email: mill.email,
          name: mill.name,
          role: mill.role,
          companyId: mill.companyId,
          companyName: mill.company.name,
          millUserId: mill.id,
          deskSessionId: desk.id,
          deskLocked: true,
        };
      },
    }),
  ],
  events: {
    async signOut({ token }) {
      if (token?.deskSessionId)
        await db.deskSession.updateMany({
          where: { id: token.deskSessionId },
          data: { revoked: true },
        });
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.companyId = user.companyId;
        token.companyName = user.companyName;
        token.millUserId = user.millUserId;
        token.deskSessionId = user.deskSessionId;
        token.deskLocked = user.deskLocked;
      }
      // Read through the revocable server record on every session resolution.
      if (!token.deskSessionId) {
        token.deskLocked = true;
        return token;
      }
      const desk = await db.deskSession.findUnique({
        where: { id: token.deskSessionId },
      });
      if (!desk || desk.revoked || desk.expiresAt <= new Date()) {
        token.deskLocked = true;
        token.deskSessionId = undefined;
        return token;
      }
      const mill = await db.user.findFirst({
        where: {
          id: desk.millUserId,
          isActive: true,
          role: "OWNER",
          company: { status: "ACTIVE" },
        },
        select: { companyId: true },
      });
      if (!mill) {
        token.deskLocked = true;
        token.deskSessionId = undefined;
        return token;
      }
      if (desk.personId) {
        const person = await db.user.findFirst({
          where: {
            id: desk.personId,
            companyId: mill.companyId,
            isActive: true,
          },
          select: { name: true, email: true, role: true },
        });
        if (!person) {
          token.deskLocked = true;
          return token;
        }
        token.id = desk.personId;
        token.role = person.role;
        token.name = person.name;
        token.email = person.email;
      }
      token.deskLocked = !desk.personId;
      return token;
    },
    async session({ session, token }) {
      session.desk = token.deskSessionId
        ? {
            millUserId: token.millUserId!,
            companyId: token.companyId,
            companyName: token.companyName,
            locked: !!token.deskLocked,
          }
        : undefined;
      if (token.deskLocked) {
        // A mill login alone never provides a business actor to any page or action.
        delete (session as unknown as { user?: unknown }).user;
      } else if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.companyId = token.companyId;
        session.user.companyName = token.companyName;
        session.user.name = token.name ?? "";
        session.user.email = token.email ?? "";
      }
      return session;
    },
  },
};
