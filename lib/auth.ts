import { db } from "@/db";
import { users } from "@/db/schema/user";
import { eq } from "drizzle-orm";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { email, password } = credentials as {
          email: string;
          password: string;
        };

        if (!email || !password) {
          return null;
        }

        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (user.length === 0) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          password,
          user[0].passwordHash || "",
        );

        if (!isPasswordValid) {
          return null;
        }

        const { passwordHash, ...userWithoutPassword } = user[0];
        return userWithoutPassword;
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth sign-in
      if (account?.provider === "google") {
        const email = user.email;
        if (!email) return false;

        // Check if user exists in database
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        // If user doesn't exist, create a new one
        if (existingUser.length === 0) {
          await db.insert(users).values({
            email: email,
            fullName: user.name || email.split("@")[0],
            avatarUrl: user.image || null,
            role: "candidate",
            authProvider: "google",
            emailVerified: true,
            passwordHash: "GOOGLE_OAUTH",
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // On initial sign-in, user object is available
      if (user) {
        // Fetch user from database to get the UUID and role
        const dbUser = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email!))
          .limit(1);

        if (dbUser.length > 0) {
          token.id = dbUser[0].id;
          token.email = dbUser[0].email;
          token.role = dbUser[0].role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
