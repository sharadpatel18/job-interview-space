import { db } from "@/db";
import { users } from "@/db/schema/user";
import { eq } from "drizzle-orm";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";

export const authOptions = {
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
          user[0].passwordHash || ""
        );

        if (!isPasswordValid) {
          return null;
        }

        const { passwordHash, ...userWithoutPassword } = user[0];
        return userWithoutPassword;
      },
    }),
    
  ],
};
