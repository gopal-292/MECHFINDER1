import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z
  .object({
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    isAvailable: z.boolean().optional(),
  })
  .refine(
    (d) => d.lat !== undefined || d.lng !== undefined || d.isAvailable !== undefined,
    { message: "Nothing to update" },
  );

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

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const data: { lat?: number; lng?: number; isAvailable?: boolean } = {};
  if (parsed.data.lat !== undefined) data.lat = parsed.data.lat;
  if (parsed.data.lng !== undefined) data.lng = parsed.data.lng;
  if (parsed.data.isAvailable !== undefined) data.isAvailable = parsed.data.isAvailable;

  const updated = await prisma.mechanic.update({
    where: { userId: session.user.id },
    data,
    select: { lat: true, lng: true, isAvailable: true },
  });

  return NextResponse.json({ ok: true, mechanic: updated });
}
