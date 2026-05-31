"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import type { RequestStatus } from "@prisma/client";
import { REQUEST_STEPS, STATUS_META, formatDistance } from "@/lib/geo";

type TrackedRequest = {
  id: string;
  status: string;
  latitude: number;
  longitude: number;
  address: string | null;
  vehicleType: string | null;
  vehicleModel: string | null;
  issueDescription: string;
  createdAt: string;
  mechanic: {
    name: string;
    phone: string | null;
    lat: number | null;
    lng: number | null;
    distanceKm: number | null;
    etaMinutes: number | null;
  } | null;
  review: { id: string; rating: number; comment: string | null } | null;
};

const POLL_MS = 5000;

export default function TrackPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [request, setRequest] = useState<TrackedRequest | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/requests/${id}`, { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoadError(data?.error ?? "Could not load this request.");
        return;
      }
      const data = await res.json();
      setRequest(data.request);
      setLoadError(null);
    } catch {
      setLoadError("Network error while loading the request.");
    }
  }, [id]);

  useEffect(() => {
    load();
    const terminal = request?.status === "COMPLETED" || request?.status === "CANCELLED";
    if (terminal) return;
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load, request?.status]);

  if (loadError && !request) {
    return (
      <main className="container flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{loadError}</p>
        <Button asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </main>
    );
  }

  if (!request) {
    return (
      <main className="container flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  const isCancelled = request.status === "CANCELLED";
  const isCompleted = request.status === "COMPLETED";
  const canCancel = request.status === "PENDING" || request.status === "ACCEPTED";

  // Center the map on the mechanic when known (so the user watches them approach),
  // otherwise on the user's own breakdown location.
  const focus =
    request.mechanic?.lat != null && request.mechanic?.lng != null
      ? { lat: request.mechanic.lat, lng: request.mechanic.lng }
      : { lat: request.latitude, lng: request.longitude };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="container flex items-center justify-between py-4">
          <Link href="/dashboard" className="text-xl font-bold">
            WebMech
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </header>

      <section className="container max-w-2xl space-y-6 py-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Tracking your request</h1>
            <p className="text-muted-foreground">
              {STATUS_META[request.status as RequestStatus]?.description}
            </p>
          </div>
          <StatusBadge status={request.status} />
        </div>

        {!isCancelled ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {REQUEST_STEPS.map((step) => {
                  const currentIdx = REQUEST_STEPS.indexOf(request.status as RequestStatus);
                  const stepIdx = REQUEST_STEPS.indexOf(step);
                  const done = currentIdx >= stepIdx && currentIdx !== -1;
                  const current = currentIdx === stepIdx;
                  return (
                    <li key={step} className="flex items-center gap-3">
                      <span
                        className={
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs " +
                          (done ? "bg-green-600 text-white" : "bg-slate-200 text-slate-500")
                        }
                      >
                        {done ? "✓" : stepIdx + 1}
                      </span>
                      <span
                        className={
                          "text-sm " +
                          (current ? "font-semibold" : done ? "text-foreground" : "text-muted-foreground")
                        }
                      >
                        {STATUS_META[step].label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        ) : null}

        {request.mechanic ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your mechanic</CardTitle>
              <CardDescription>{request.mechanic.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {request.mechanic.distanceKm != null ? (
                <p>
                  <span className="font-medium">{formatDistance(request.mechanic.distanceKm)}</span>{" "}
                  away
                  {request.mechanic.etaMinutes != null
                    ? ` · ~${request.mechanic.etaMinutes} min ETA`
                    : ""}
                </p>
              ) : null}
              {request.mechanic.phone ? (
                <a
                  href={`tel:${request.mechanic.phone}`}
                  className="font-medium text-primary hover:underline"
                >
                  Call {request.mechanic.phone}
                </a>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {!isCancelled ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Map</CardTitle>
              <CardDescription>
                {request.mechanic?.lat != null
                  ? "Showing your mechanic's last known location."
                  : "Showing your breakdown location."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border">
                <iframe
                  title="Live tracking map"
                  className="h-64 w-full"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${focus.lng - 0.01}%2C${focus.lat - 0.01}%2C${focus.lng + 0.01}%2C${focus.lat + 0.01}&layer=mapnik&marker=${focus.lat}%2C${focus.lng}`}
                />
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Request details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="font-medium">{request.vehicleType}</span>
              {request.vehicleModel ? ` · ${request.vehicleModel}` : ""}
            </p>
            <p className="text-muted-foreground">{request.issueDescription}</p>
            {request.address ? (
              <p className="text-muted-foreground">Landmark: {request.address}</p>
            ) : null}
          </CardContent>
        </Card>

        {canCancel ? <CancelButton id={id} onDone={load} /> : null}

        {isCompleted ? (
          <ReviewSection request={request} onDone={load} />
        ) : null}
      </section>
    </main>
  );
}

function CancelButton({ id, onDone }: { id: string; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function cancel() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Could not cancel.");
        return;
      }
      onDone();
    });
  }

  return (
    <div className="space-y-2">
      <Button variant="destructive" onClick={cancel} disabled={isPending}>
        {isPending ? "Cancelling…" : "Cancel request"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function ReviewSection({
  request,
  onDone,
}: {
  request: TrackedRequest;
  onDone: () => void;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (request.review) {
    return (
      <Card className="border-green-300 bg-green-50">
        <CardHeader>
          <CardTitle className="text-lg">Thanks for your feedback</CardTitle>
          <CardDescription>
            You rated this job {"★".repeat(request.review.rating)}
            {"☆".repeat(5 - request.review.rating)}
          </CardDescription>
        </CardHeader>
        {request.review.comment ? (
          <CardContent className="text-sm text-muted-foreground">
            “{request.review.comment}”
          </CardContent>
        ) : null}
      </Card>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceRequestId: request.id,
          rating,
          comment: comment || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Could not submit your review.");
        return;
      }
      onDone();
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Rate your mechanic</CardTitle>
        <CardDescription>How did it go?</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit}>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                className={
                  "text-3xl leading-none transition-colors " +
                  (n <= rating ? "text-amber-500" : "text-slate-300")
                }
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            rows={3}
            placeholder="Leave a note (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Submitting…" : "Submit review"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
