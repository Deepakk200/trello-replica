import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import { db } from "@/lib/db";
import { slugify, shortId } from "@/lib/slug";

// This project's User model uses `avatarUrl`, NOT Auth.js's default `image`
// column. The stock PrismaAdapter writes `image` on create/update, which throws
// ("Unknown argument image") and breaks Google/OAuth sign-in. Wrap the adapter
// so create/update map image → avatarUrl; reads map avatarUrl → image so the rest
// of Auth.js still sees an `image` field. No schema change / migration needed.
type DbUserRow = { id: string; email: string; name: string | null; avatarUrl: string | null; emailVerified: Date | null };
const toAdapterUser = (u: DbUserRow): AdapterUser => ({
  id: u.id, email: u.email, name: u.name, image: u.avatarUrl, emailVerified: u.emailVerified,
});

function authAdapter(): Adapter {
  const base = PrismaAdapter(db);
  return {
    ...base,
    createUser: async ({ email, name, emailVerified, image }) => {
      const u = await db.user.create({
        data: { email: email!, name: name ?? null, emailVerified: emailVerified ?? null, avatarUrl: image ?? null },
      });
      return toAdapterUser(u);
    },
    updateUser: async ({ id, email, name, emailVerified, image }) => {
      const u = await db.user.update({
        where: { id },
        data: {
          ...(email != null ? { email } : {}),
          ...(name !== undefined ? { name } : {}),
          ...(emailVerified !== undefined ? { emailVerified } : {}),
          ...(image !== undefined ? { avatarUrl: image ?? null } : {}),
        },
      });
      return toAdapterUser(u);
    },
  };
}

// Build the OAuth provider list. CRITICAL: register a provider ONLY when both its
// id AND secret are present. Auth.js v5 runs `assertConfig` per request, and a
// single OAuth provider with an undefined clientId/secret makes the ENTIRE config
// invalid — so EVERY sign-in (Google, GitHub, AND credentials) fails with
// `?error=Configuration`. Previously Google was registered unconditionally with
// `process.env.GOOGLE_CLIENT_ID!`; if that var was absent/misnamed in the
// environment it broke all auth. We also accept both env-var naming conventions:
// the Auth.js default (`AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`) and the project's
// historical `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`.
function oauthProviders() {
  const list = [];
  const googleId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID;
  const googleSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;
  if (googleId && googleSecret)
    list.push(
      Google({
        clientId: googleId,
        clientSecret: googleSecret,
        // Link an OAuth sign-in to an existing user with the SAME email (e.g. one
        // created via email/password) instead of failing with
        // `OAuthAccountNotLinked`. Enabled ONLY for providers that verify email
        // ownership: Google asserts the OIDC `email_verified` claim, so the signer
        // provably controls that inbox — this is not an account-takeover vector.
        allowDangerousEmailAccountLinking: true,
      }),
    );

  const githubId = process.env.AUTH_GITHUB_ID ?? process.env.GITHUB_CLIENT_ID;
  const githubSecret = process.env.AUTH_GITHUB_SECRET ?? process.env.GITHUB_CLIENT_SECRET;
  if (githubId && githubSecret)
    list.push(
      GitHub({
        clientId: githubId,
        clientSecret: githubSecret,
        // GitHub's OAuth provider resolves the account's PRIMARY email, which
        // GitHub requires to be verified before it can become primary. We treat
        // that as proof of ownership and allow same-email linking, matching Google
        // above. The app's account model intentionally treats one email = one
        // user, so credentials + Google + GitHub on the same address converge.
        allowDangerousEmailAccountLinking: true,
      }),
    );

  return list;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: authAdapter(),
  // Read the session/JWT secret explicitly, supporting both the Auth.js name and
  // the legacy NextAuth name so a mis-named env var can't silently disable auth.
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  // Trust the incoming host. Required for self-hosted / local dev (and any non-
  // Vercel host, e.g. a different port, 127.0.0.1, or a LAN IP): without it
  // Auth.js v5 throws `UntrustedHost`, which makes `auth()` fail inside proxy.ts
  // so every protected route (e.g. a board's /b/<id>/<slug>) redirects to
  // /sign-in and bounces back via callbackUrl — an infinite redirect loop.
  // Vercel auto-trusts its host, so this is a safe no-op there.
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    // OAuth providers are only added when fully configured (see oauthProviders).
    ...oauthProviders(),
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
  events: {
    // OAuth users are created via the adapter with no workspace. The credentials
    // flow (signUpUser) creates a personal workspace + OWNER membership; mirror
    // that here so OAuth users can create boards (board.createdById/workspace FK
    // both resolve). Credentials users never hit the adapter, so this won't
    // double-create for them.
    async createUser({ user }) {
      if (!user.id) return;
      const existing = await db.workspaceMember.findFirst({ where: { userId: user.id } });
      if (existing) return;
      const base = user.name ?? user.email?.split("@")[0] ?? "My";
      await db.workspace.create({
        data: {
          name: `${base}'s Workspace`,
          slug: `${slugify(base)}-${shortId()}`,
          members: { create: { userId: user.id, role: "OWNER" } },
        },
      });
    },
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
});
