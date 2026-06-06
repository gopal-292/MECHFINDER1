import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { haversineKm, etaMinutes, formatDistance } from "@/lib/geo";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MECHANIC") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mechanic = await prisma.mechanic.findUnique({
    where: { userId: session.user.id },
  });
  if (!mechanic || !mechanic.isApproved) {
    return NextResponse.json({ error: "Mechanic not approved" }, { status: 403 });
  }

  const hasLoc = mechanic.lat != null && mechanic.lng != null;
  const me = hasLoc
    ? { lat: mechanic.lat as number, lng: mechanic.lng as number }
    : null;

  // The mechanic's current active job (if any).
  const activeJobRow = await prisma.serviceRequest.findFirst({
    where: {
      mechanicId: mechanic.id,
      status: { in: ["ACCEPTED", "ON_WAY", "ARRIVED"] },
    },
    orderBy: { updatedAt: "desc" },
    include: { user: { select: { name: true, phone: true } } },
  });

  const activeJob = activeJobRow
    ? {
        id: activeJobRow.id,
        status: activeJobRow.status,
        latitude: activeJobRow.latitude,
        longitude: activeJobRow.longitude,
        address: activeJobRow.address,
        vehicleType: activeJobRow.vehicleType,
        vehicleModel: activeJobRow.vehicleModel,
        issueDescription: activeJobRow.issueDescription,
        aiTriage: activeJobRow.aiTriage,
        customerName: activeJobRow.user.name,
        customerPhone: activeJobRow.user.phone,
        distanceKm: me
          ? haversineKm(me, {
              lat: activeJobRow.latitude,
              lng: activeJobRow.longitude,
            })
          : null,
      }
    : null;

  // Pending, unassigned jobs within this mechanic's service radius.
  let pending: Array<Record<string, unknown>> = [];
  if (me) {
    const open = await prisma.serviceRequest.findMany({
      where: { status: "PENDING", mechanicId: null },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    pending = open
      .map((r) => {
        const distanceKm = haversineKm(me, { lat: r.latitude, lng: r.longitude });
        return {
          id: r.id,
          vehicleType: r.vehicleType,
          vehicleModel: r.vehicleModel,
          issueDescription: r.issueDescription,
          aiTriage: r.aiTriage,
          address: r.address,
          latitude: r.latitude,
          longitude: r.longitude,
          createdAt: r.createdAt,
          distanceKm,
          distanceLabel: formatDistance(distanceKm),
          etaMinutes: etaMinutes(distanceKm),
        };
      })
      .filter((r) => (r.distanceKm as number) <= mechanic.serviceRadiusKm)
      .sort((a, b) => (a.distanceKm as number) - (b.distanceKm as number));
  }

  return NextResponse.json({
    mechanic: {
      isAvailable: mechanic.isAvailable,
      hasLocation: hasLoc,
      serviceRadiusKm: mechanic.serviceRadiusKm,
    },
    activeJob,
    pending,
  });
}
