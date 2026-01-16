import { db } from "@/db";
import { users } from "@/db/schema/user";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { VALID_ROLES } from "@/types/constant";
import bcrypt from "bcrypt";

export async function POST(request: Request) {
  try {
    const { fullName, email, password, authProvider, avatarUrl, role } =
      await request.json();

    if (!fullName || !email || !password || !authProvider || !role) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { message: "Invalid role specified" },
        { status: 400 }
      );
    }

    const existedUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existedUser.length > 0) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await db.insert(users).values({
      fullName: fullName,
      email: email,
      passwordHash: passwordHash,
      authProvider: authProvider,
      avatarUrl: avatarUrl || null,
      role: role,
    });

    return NextResponse.json(
      { message: "User created successfully", success: true },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error during signup:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
