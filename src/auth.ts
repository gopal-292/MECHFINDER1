import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig, type AppRole } from "@/auth.config";

export type { AppRole };

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      mechanicApproved?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: AppRole;
    mechanicApproved?: boolean;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          include: { mechanic: true },
        });
        if (!user) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as AppRole,
          mechanicApproved: user.mechanic?.isApproved ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      const t = token as typeof token & {
        id?: string;
        role?: AppRole;
        mechanicApproved?: boolean;
      };

      if (user) {
        t.id = (user as { id?: string }).id ?? t.id;
        t.role = (user as { role?: AppRole }).role ?? t.role;
        t.mechanicApproved = (user as { mechanicApproved?: boolean }).mechanicApproved;
      }

      // On every request, if this is a MECHANIC, refresh approval flag from DB.
      // Cheap (single row by id) and keeps middleware honest after an admin approves them.
      if (trigger !== "signIn" && t.role === "MECHANIC" && t.id) {
        const mech = await prisma.mechanic.findUnique({
          where: { userId: t.id },
          select: { isApproved: true },
        });
        t.mechanicApproved = mech?.isApproved ?? false;
      }
      return t;
    },
  },
});
