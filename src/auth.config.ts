import type { Role } from "@prisma/client";
import type { NextAuthConfig } from "next-auth";

// Edge-safe config shared with middleware — no Prisma imports here.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    // Roughly one shift. The live database check in lib/auth-guard is what
    // actually revokes access (block, demote, password change take effect
    // immediately); this bounds how long a token stolen off a shop counter
    // stays useful before it needs the password again.
    maxAge: 60 * 60 * 8,
    updateAge: 60 * 60,
  },
  providers: [],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      // Profile edits refresh the JWT without forcing a re-login.
      if (trigger === "update" && session?.user) {
        if (typeof session.user.name === "string") token.name = session.user.name;
        if (typeof session.user.image === "string") token.picture = session.user.image;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      // Surfaced so lib/auth-guard can reject tokens minted before an
      // account's sessionsValidFrom cut-off.
      session.iat = token.iat;
      return session;
    },
  },
} satisfies NextAuthConfig;
