import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mechanics = await prisma.mechanic.findMany({
    orderBy: [{ isApproved: "asc" }, { createdAt: "asc" }],
    include: {
      user: { select: { name: true, email: true, phone: true } },
      _count: { select: { serviceRequests: true, reviews: true } },
    },
  });

  return NextResponse.json({
    mechanics: mechanics.map((m) => ({
      id: m.id,
      name: m.user.name,
      email: m.user.email,
      phone: m.user.phone,
      bio: m.bio,
      specializations: m.specializations,
      vehicleTypes: m.vehicleTypes,
      serviceRadiusKm: m.serviceRadiusKm,
      isApproved: m.isApproved,
      isAvailable: m.isAvailable,
      jobCount: m._count.serviceRequests,
      reviewCount: m._count.reviews,
      createdAt: m.createdAt,
    })),
  });
}

const patchSchema = z.object({
  mechanicId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
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
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const exists = await prisma.mechanic.findUnique({
    where: { id: parsed.data.mechanicId },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ error: "Mechanic not found" }, { status: 404 });
  }

  const approve = parsed.data.action === "approve";
  const updated = await prisma.mechanic.update({
    where: { id: parsed.data.mechanicId },
    // Rejecting/revoking also forces them offline so no new jobs slip through.
    data: approve ? { isApproved: true } : { isApproved: false, isAvailable: false },
    select: { id: true, isApproved: true },
  });

  return NextResponse.json({ ok: true, mechanic: updated });
}
