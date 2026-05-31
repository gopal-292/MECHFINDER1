import type { NextAuthConfig } from "next-auth";

export type AppRole = "USER" | "MECHANIC" | "ADMIN";

/**
 * Edge-safe NextAuth config: no DB access, no bcrypt, no Prisma.
 * Imported by middleware. The full config in `src/auth.ts` extends this
 * with the Credentials provider (which needs Node APIs).
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async session({ session, token }) {
      const t = token as typeof token & {
        id?: string;
        role?: AppRole;
        mechanicApproved?: boolean;
      };
      if (session.user) {
        session.user.id = t.id ?? "";
        session.user.role = (t.role ?? "USER") as AppRole;
        session.user.mechanicApproved = t.mechanicApproved;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
