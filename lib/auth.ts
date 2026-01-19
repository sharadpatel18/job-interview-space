import { db } from "@/db";
import { users } from "@/db/schema/user";
import { eq } from "drizzle-orm";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";
import type { NextAuthOptions } from "next-auth";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

if (!googleClientId || !googleClientSecret || !nextAuthSecret) {
  throw new Error(
    "Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or NEXTAUTH_SECRET",
  );
}

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const result = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email))
          .limit(1);

        if (result.length === 0) return null;

        const user = result[0];

        if (user.authProvider !== "credentials" && user.authProvider !== null) {
          return null;
        }

        if (!user.passwordHash) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash,
        );

        if (!isPasswordValid) return null;

        const { passwordHash, ...safeUser } = user;
        return safeUser;
      },
    }),
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],

  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  jwt: {
    secret: nextAuthSecret,
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;

        // Check if user exists with a different auth provider
        const existingUser = await db
          .select({ authProvider: users.authProvider })
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1);

        if (existingUser.length > 0 && existingUser[0].authProvider === "credentials") {
          // User exists with credentials - don't allow Google sign-in
          return false;
        }

        await db
          .insert(users)
          .values({
            email: user.email,
            fullName: user.name ?? user.email.split("@")[0],
            avatarUrl: user.image ?? null,
            role: "candidate",
            authProvider: "google",
            emailVerified: true,
            passwordHash: null,
          })
          .onConflictDoNothing({ target: users.email });
      }
      return true;    },
    async jwt({ token, user }) {
      if (!user?.email) return token;

      token.email = user.email;
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1);

      if (result.length > 0) {
        token.id = result[0].id;
        token.role = result[0].role;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token?.id && token?.role) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
