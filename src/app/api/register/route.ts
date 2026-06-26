import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().toLowerCase(),
  password: z.string().min(6).max(72),
  phone: z.string().trim().min(7, "A valid phone number is required").max(20),
  role: z.enum(["USER", "MECHANIC"]),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, email, password, phone, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      phone,
      role,
      ...(role === "MECHANIC"
        ? {
            mechanic: {
              create: {
                isApproved: false,
                serviceRadiusKm: 10,
              },
            },
          }
        : {}),
    },
    select: { id: true, email: true, role: true },
  });

  return NextResponse.json({ ok: true, user }, { status: 201 });
}
