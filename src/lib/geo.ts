import type { RequestStatus } from "@prisma/client";

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two coordinates, in kilometres. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rough driving ETA assuming an average city speed of 30 km/h. */
export function etaMinutes(distanceKm: number): number {
  const AVG_SPEED_KMH = 30;
  return Math.max(1, Math.round((distanceKm / AVG_SPEED_KMH) * 60));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/** SQLite stores photoUrls as a JSON string; parse it defensively. */
export function parsePhotoUrls(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((u) => typeof u === "string") : [];
  } catch {
    return [];
  }
}

export const REQUEST_STEPS: RequestStatus[] = [
  "PENDING",
  "ACCEPTED",
  "ON_WAY",
  "ARRIVED",
  "COMPLETED",
];

export const STATUS_META: Record<
  RequestStatus,
  { label: string; description: string; badgeClass: string }
> = {
  PENDING: {
    label: "Finding a mechanic",
    description: "We're notifying nearby mechanics. Hang tight.",
    badgeClass: "bg-amber-100 text-amber-900",
  },
  ACCEPTED: {
    label: "Mechanic assigned",
    description: "A mechanic accepted your request and will set off shortly.",
    badgeClass: "bg-blue-100 text-blue-900",
  },
  ON_WAY: {
    label: "On the way",
    description: "Your mechanic is driving to your location.",
    badgeClass: "bg-indigo-100 text-indigo-900",
  },
  ARRIVED: {
    label: "Arrived",
    description: "Your mechanic is at your location.",
    badgeClass: "bg-violet-100 text-violet-900",
  },
  COMPLETED: {
    label: "Completed",
    description: "Job done. Hope you're back on the road!",
    badgeClass: "bg-green-100 text-green-900",
  },
  CANCELLED: {
    label: "Cancelled",
    description: "This request was cancelled.",
    badgeClass: "bg-slate-200 text-slate-700",
  },
};

export const ACTIVE_STATUSES: RequestStatus[] = [
  "PENDING",
  "ACCEPTED",
  "ON_WAY",
  "ARRIVED",
];
