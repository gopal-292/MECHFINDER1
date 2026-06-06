import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ACTIVE_STATUSES, haversineKm, etaMinutes, parsePhotoUrls } from "@/lib/geo";

type RouteCtx = { params: { id: string } };

export async function GET(_req: Request, { params }: RouteCtx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const request = await prisma.serviceRequest.findUnique({
    where: { id: params.id },
    include: {
      mechanic: {
        include: { user: { select: { name: true, phone: true } } },
      },
      review: true,
    },
  });

  if (!request) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Owners can read their own; the assigned mechanic can also read it.
  const isOwner = request.userId === session.user.id;
  const isAssignedMechanic =
    session.user.role === "MECHANIC" &&
    request.mechanic?.userId === session.user.id;
  if (!isOwner && !isAssignedMechanic && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let mechanic = null;
  if (request.mechanic) {
    const hasLoc =
      request.mechanic.lat != null && request.mechanic.lng != null;
    const distanceKm = hasLoc
      ? haversineKm(
          { lat: request.latitude, lng: request.longitude },
          { lat: request.mechanic.lat as number, lng: request.mechanic.lng as number },
        )
      : null;

    mechanic = {
      name: request.mechanic.user.name,
      phone: request.mechanic.user.phone,
      lat: request.mechanic.lat,
      lng: request.mechanic.lng,
      distanceKm,
      etaMinutes: distanceKm != null ? etaMinutes(distanceKm) : null,
    };
  }

  return NextResponse.json({
    request: {
      id: request.id,
      status: request.status,
      latitude: request.latitude,
      longitude: request.longitude,
      address: request.address,
      vehicleType: request.vehicleType,
      vehicleModel: request.vehicleModel,
      issueDescription: request.issueDescription,
      aiTriage: request.aiTriage,
      photoUrls: parsePhotoUrls(request.photoUrls),
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      mechanic,
      review: request.review,
    },
  });
}

const patchSchema = z.object({
  action: z.enum(["cancel", "accept", "on_way", "arrived", "complete"]),
});

export async function PATCH(req: Request, { params }: RouteCtx) {
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
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }
  const { action } = parsed.data;

  const request = await prisma.serviceRequest.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      userId: true,
      status: true,
      mechanicId: true,
      mechanic: { select: { userId: true } },
    },
  });
  if (!request) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ----- USER: cancel -----
  if (action === "cancel") {
    if (session.user.role !== "USER" || request.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Can only cancel before the mechanic has arrived.
    if (!ACTIVE_STATUSES.includes(request.status) || request.status === "ARRIVED") {
      return NextResponse.json(
        { error: "This request can no longer be cancelled." },
        { status: 409 },
      );
    }
    const updated = await prisma.serviceRequest.update({
      where: { id: params.id },
      data: { status: "CANCELLED", mechanicId: null },
      select: { id: true, status: true },
    });
    return NextResponse.json({ ok: true, request: updated });
  }

  // ----- MECHANIC: accept / advance status -----
  if (session.user.role !== "MECHANIC") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const mechanic = await prisma.mechanic.findUnique({
    where: { userId: session.user.id },
    select: { id: true, isApproved: true },
  });
  if (!mechanic || !mechanic.isApproved) {
    return NextResponse.json({ error: "Mechanic not approved" }, { status: 403 });
  }

  if (action === "accept") {
    if (request.status !== "PENDING" || request.mechanicId) {
      return NextResponse.json(
        { error: "This job is no longer available." },
        { status: 409 },
      );
    }
    // One active job at a time.
    const existingActive = await prisma.serviceRequest.findFirst({
      where: {
        mechanicId: mechanic.id,
        status: { in: ["ACCEPTED", "ON_WAY", "ARRIVED"] },
      },
      select: { id: true },
    });
    if (existingActive) {
      return NextResponse.json(
        { error: "Finish your current job before accepting another." },
        { status: 409 },
      );
    }
    const updated = await prisma.serviceRequest.update({
      where: { id: params.id },
      data: { status: "ACCEPTED", mechanicId: mechanic.id },
      select: { id: true, status: true },
    });
    return NextResponse.json({ ok: true, request: updated });
  }

  // Remaining actions require this mechanic to own the job.
  if (request.mechanic?.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const transitions: Record<string, { from: string; to: string }> = {
    on_way: { from: "ACCEPTED", to: "ON_WAY" },
    arrived: { from: "ON_WAY", to: "ARRIVED" },
    complete: { from: "ARRIVED", to: "COMPLETED" },
  };
  const t = transitions[action];
  if (!t || request.status !== t.from) {
    return NextResponse.json(
      { error: `Cannot ${action.replace("_", " ")} from ${request.status}.` },
      { status: 409 },
    );
  }

  const updated = await prisma.serviceRequest.update({
    where: { id: params.id },
    data: { status: t.to as never },
    select: { id: true, status: true },
  });
  return NextResponse.json({ ok: true, request: updated });
}
