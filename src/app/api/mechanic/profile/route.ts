import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MECHANIC") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mechanic = await prisma.mechanic.findUnique({
    where: { userId: session.user.id },
    select: {
      bio: true,
      specializations: true,
      vehicleTypes: true,
      serviceRadiusKm: true,
      isApproved: true,
      isAvailable: true,
      lat: true,
      lng: true,
    },
  });
  if (!mechanic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ profile: mechanic });
}

const patchSchema = z.object({
  bio: z.string().max(500).optional(),
  specializations: z.string().max(200).optional(),
  vehicleTypes: z.string().max(200).optional(),
  serviceRadiusKm: z.number().min(1).max(100).optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MECHANIC") {
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

  const updated = await prisma.mechanic.update({
    where: { userId: session.user.id },
    data: parsed.data,
    select: {
      bio: true,
      specializations: true,
      vehicleTypes: true,
      serviceRadiusKm: true,
    },
  });

  return NextResponse.json({ ok: true, profile: updated });
}
