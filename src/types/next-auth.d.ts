import type { UserRole } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    millUserId?: string;
    deskSessionId?: string;
    deskLocked?: boolean;
    role: UserRole;
    companyId: string;
    companyName: string;
  }
  interface Session {
    desk?: {
      millUserId: string;
      companyId: string;
      companyName: string;
      locked: boolean;
    };
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      companyId: string;
      companyName: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    millUserId?: string;
    deskSessionId?: string;
    deskLocked?: boolean;
    role: UserRole;
    companyId: string;
    companyName: string;
  }
}
