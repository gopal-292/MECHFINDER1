import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true, role: true, createdAt: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ profile: user });
}

const patchSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    phone: z
      .string()
      .max(20)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6).max(72).optional(),
  })
  .refine((d) => !d.newPassword || !!d.currentPassword, {
    message: "Current password is required to set a new password.",
    path: ["currentPassword"],
  });

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, phone, currentPassword, newPassword } = parsed.data;

  const data: { name?: string; phone?: string | null; passwordHash?: string } = {};
  if (name !== undefined) data.name = name;
  if (phone !== undefined) data.phone = phone || null;

  if (newPassword) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const ok = await bcrypt.compare(currentPassword ?? "", user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 403 },
      );
    }
    data.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { name: true, email: true, phone: true },
  });

  return NextResponse.json({ ok: true, profile: updated });
}
