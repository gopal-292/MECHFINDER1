import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { haversineKm, etaMinutes, formatDistance } from "@/lib/geo";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const maxKm = Number(searchParams.get("radiusKm")) || 25;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  const mechanics = await prisma.mechanic.findMany({
    where: {
      isApproved: true,
      isAvailable: true,
      lat: { not: null },
      lng: { not: null },
    },
    include: { user: { select: { name: true } } },
  });

  const here = { lat, lng };
  const nearby = mechanics
    .map((m) => {
      const distanceKm = haversineKm(here, {
        lat: m.lat as number,
        lng: m.lng as number,
      });
      return {
        id: m.id,
        name: m.user.name,
        specializations: m.specializations,
        vehicleTypes: m.vehicleTypes,
        distanceKm,
        distanceLabel: formatDistance(distanceKm),
        etaMinutes: etaMinutes(distanceKm),
        // Only surface mechanics for whom the request falls inside their own service radius.
        inRange: distanceKm <= m.serviceRadiusKm,
      };
    })
    .filter((m) => m.distanceKm <= maxKm && m.inRange)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return NextResponse.json({ count: nearby.length, mechanics: nearby });
}
