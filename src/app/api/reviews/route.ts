import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  serviceRequestId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

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

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const request = await prisma.serviceRequest.findUnique({
    where: { id: parsed.data.serviceRequestId },
    select: { id: true, userId: true, status: true, mechanicId: true, review: { select: { id: true } } },
  });

  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  if (request.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (request.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "You can only review a completed job." },
      { status: 409 },
    );
  }
  if (!request.mechanicId) {
    return NextResponse.json({ error: "No mechanic to review." }, { status: 409 });
  }
  if (request.review) {
    return NextResponse.json({ error: "You already reviewed this job." }, { status: 409 });
  }

  const review = await prisma.review.create({
    data: {
      serviceRequestId: request.id,
      userId: session.user.id,
      mechanicId: request.mechanicId,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    },
    select: { id: true, rating: true, comment: true },
  });

  return NextResponse.json({ ok: true, review }, { status: 201 });
}
