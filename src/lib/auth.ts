import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  // Trust the incoming host. Required for self-hosted / local dev (and any non-
  // Vercel host, e.g. a different port, 127.0.0.1, or a LAN IP): without it
  // Auth.js v5 throws `UntrustedHost`, which makes `auth()` fail inside proxy.ts
  // so every protected route (e.g. a board's /b/<id>/<slug>) redirects to
  // /sign-in and bounces back via callbackUrl — an infinite redirect loop.
  // Vercel auto-trusts its host, so this is a safe no-op there.
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // GitHub OAuth — only registered when configured, so it stays inert otherwise.
    ...(process.env.GITHUB_CLIENT_ID
      ? [GitHub({ clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET! })]
      : []),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        // findFirst (not findUnique): deletedAt is not part of a unique index.
        const user = await db.user.findFirst({
          where: { email: credentials.email as string, deletedAt: null },
        });
        if (!user || !user.passwordHash) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Attach the user's workspaceId to the token on first sign-in.
        const member = await db.workspaceMember.findFirst({
          where: { userId: user.id as string },
          select: { workspaceId: true },
        });
        token.workspaceId = member?.workspaceId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.workspaceId = (token.workspaceId as string | null) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
});
