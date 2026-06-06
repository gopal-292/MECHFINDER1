import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ACTIVE_STATUSES } from "@/lib/geo";
import { triageIssue } from "@/lib/triage";

const createSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().max(300).optional(),
  vehicleType: z.string().min(1).max(40),
  vehicleModel: z.string().max(80).optional(),
  issueDescription: z.string().min(3).max(1000),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = await prisma.serviceRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      mechanic: { include: { user: { select: { name: true } } } },
      review: { select: { id: true, rating: true } },
    },
  });

  return NextResponse.json({ requests });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Prevent stacking multiple open requests.
  const existingActive = await prisma.serviceRequest.findFirst({
    where: { userId: session.user.id, status: { in: ACTIVE_STATUSES } },
    select: { id: true },
  });
  if (existingActive) {
    return NextResponse.json(
      { error: "You already have an active request.", requestId: existingActive.id },
      { status: 409 },
    );
  }

  // Best-effort AI triage. Returns null (and we skip it) when GEMINI_API_KEY
  // is unset or the call fails, so request creation never depends on it.
  const aiTriage = await triageIssue({
    issueDescription: parsed.data.issueDescription,
    vehicleType: parsed.data.vehicleType,
    vehicleModel: parsed.data.vehicleModel,
  });

  const created = await prisma.serviceRequest.create({
    data: {
      userId: session.user.id,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      address: parsed.data.address,
      vehicleType: parsed.data.vehicleType,
      vehicleModel: parsed.data.vehicleModel,
      issueDescription: parsed.data.issueDescription,
      aiTriage,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, requestId: created.id }, { status: 201 });
}
