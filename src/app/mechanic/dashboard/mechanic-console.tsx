"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { formatDistance } from "@/lib/geo";

type MechState = {
  isAvailable: boolean;
  hasLocation: boolean;
  serviceRadiusKm: number;
};

type ActiveJob = {
  id: string;
  status: string;
  latitude: number;
  longitude: number;
  address: string | null;
  vehicleType: string | null;
  vehicleModel: string | null;
  issueDescription: string;
  aiTriage: string | null;
  customerName: string;
  customerPhone: string | null;
  distanceKm: number | null;
};

type PendingJob = {
  id: string;
  vehicleType: string | null;
  vehicleModel: string | null;
  issueDescription: string;
  aiTriage: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  distanceLabel: string;
  etaMinutes: number;
};

function TriageNote({ text }: { text: string }) {
  return (
    <div className="mt-2 rounded-md border border-violet-200 bg-violet-50 p-2">
      <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
        AI triage
      </p>
      <p className="text-xs text-violet-900">{text}</p>
    </div>
  );
}

type Feed = {
  mechanic: MechState;
  activeJob: ActiveJob | null;
  pending: PendingJob[];
};

const POLL_MS = 5000;

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });
}

export function MechanicConsole() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/mechanic/requests", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setFeed(data);
    } catch {
      /* transient */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const pushLocation = useCallback(
    async (lat: number, lng: number, extra?: { isAvailable?: boolean }) => {
      await fetch("/api/mechanic/location", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, ...extra }),
      });
    },
    [],
  );

  // Broadcast live GPS while driving to the customer (status ON_WAY).
  useEffect(() => {
    const onWay = feed?.activeJob?.status === "ON_WAY";
    if (onWay && watchIdRef.current === null && "geolocation" in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          pushLocation(pos.coords.latitude, pos.coords.longitude);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 },
      );
    }
    if (!onWay && watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [feed?.activeJob?.status, pushLocation]);

  async function toggleAvailability() {
    setError(null);
    setBusy(true);
    try {
      const goingOnline = !feed?.mechanic.isAvailable;
      if (goingOnline) {
        if (!("geolocation" in navigator)) {
          setError("Geolocation isn't supported on this device.");
          return;
        }
        const pos = await getPosition();
        await pushLocation(pos.coords.latitude, pos.coords.longitude, {
          isAvailable: true,
        });
      } else {
        await fetch("/api/mechanic/location", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isAvailable: false }),
        });
      }
      await load();
    } catch {
      setError("Couldn't get your location. Enable location permission and retry.");
    } finally {
      setBusy(false);
    }
  }

  async function refreshLocation() {
    setError(null);
    setBusy(true);
    try {
      const pos = await getPosition();
      await pushLocation(pos.coords.latitude, pos.coords.longitude);
      await load();
    } catch {
      setError("Couldn't update your location.");
    } finally {
      setBusy(false);
    }
  }

  async function act(id: string, action: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Action failed.");
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!feed) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  const { mechanic, activeJob, pending } = feed;

  return (
    <div className="space-y-6">
      {/* Availability control */}
      <Card className={mechanic.isAvailable ? "border-green-300 bg-green-50" : undefined}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">
                {mechanic.isAvailable ? "You're online" : "You're offline"}
              </CardTitle>
              <CardDescription>
                {mechanic.isAvailable
                  ? `Receiving jobs within ${mechanic.serviceRadiusKm} km of you.`
                  : "Go online to see and accept nearby jobs."}
              </CardDescription>
            </div>
            <span
              className={
                "inline-flex h-3 w-3 rounded-full " +
                (mechanic.isAvailable ? "bg-green-500" : "bg-slate-300")
              }
            />
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            onClick={toggleAvailability}
            disabled={busy}
            className={
              mechanic.isAvailable
                ? "bg-slate-700 text-white hover:bg-slate-800"
                : "bg-green-600 text-white hover:bg-green-700"
            }
          >
            {mechanic.isAvailable ? "Go offline" : "Go online"}
          </Button>
          {mechanic.isAvailable ? (
            <Button variant="outline" onClick={refreshLocation} disabled={busy}>
              Update my location
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      {/* Active job */}
      {activeJob ? (
        <Card className="border-blue-300 bg-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">Current job</CardTitle>
              <StatusBadge status={activeJob.status} />
            </div>
            <CardDescription>
              {activeJob.customerName}
              {activeJob.distanceKm != null
                ? ` · ${formatDistance(activeJob.distanceKm)} away`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm">
              <p className="font-medium">
                {activeJob.vehicleType}
                {activeJob.vehicleModel ? ` · ${activeJob.vehicleModel}` : ""}
              </p>
              <p className="text-muted-foreground">{activeJob.issueDescription}</p>
              {activeJob.address ? (
                <p className="text-muted-foreground">Landmark: {activeJob.address}</p>
              ) : null}
              {activeJob.aiTriage ? <TriageNote text={activeJob.aiTriage} /> : null}
            </div>

            <div className="overflow-hidden rounded-md border">
              <iframe
                title="Customer location"
                className="h-56 w-full"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${activeJob.longitude - 0.01}%2C${activeJob.latitude - 0.01}%2C${activeJob.longitude + 0.01}%2C${activeJob.latitude + 0.01}&layer=mapnik&marker=${activeJob.latitude}%2C${activeJob.longitude}`}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {activeJob.customerPhone ? (
                <Button variant="outline" asChild>
                  <a href={`tel:${activeJob.customerPhone}`}>Call customer</a>
                </Button>
              ) : null}
              <Button asChild variant="outline">
                <a
                  href={`https://www.openstreetmap.org/directions?to=${activeJob.latitude}%2C${activeJob.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Directions
                </a>
              </Button>
              {activeJob.status === "ACCEPTED" ? (
                <Button onClick={() => act(activeJob.id, "on_way")} disabled={busy}>
                  Start driving
                </Button>
              ) : null}
              {activeJob.status === "ON_WAY" ? (
                <Button onClick={() => act(activeJob.id, "arrived")} disabled={busy}>
                  Mark arrived
                </Button>
              ) : null}
              {activeJob.status === "ARRIVED" ? (
                <Button
                  onClick={() => act(activeJob.id, "complete")}
                  disabled={busy}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  Mark completed
                </Button>
              ) : null}
            </div>
            {activeJob.status === "ON_WAY" ? (
              <p className="text-xs text-blue-900">
                Your live location is being shared with the customer.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Pending jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nearby jobs</CardTitle>
          <CardDescription>
            {!mechanic.isAvailable
              ? "Go online to see jobs."
              : !mechanic.hasLocation
                ? "Set your location to see jobs."
                : activeJob
                  ? "Finish your current job to accept another."
                  : pending.length === 0
                    ? "No open jobs in your area right now — sit tight."
                    : `${pending.length} open ${pending.length === 1 ? "job" : "jobs"} near you.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {mechanic.isAvailable && !activeJob && pending.length > 0
            ? pending.map((job) => (
                <div key={job.id} className="rounded-md border bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm">
                      <p className="font-medium">
                        {job.vehicleType}
                        {job.vehicleModel ? ` · ${job.vehicleModel}` : ""}
                      </p>
                      <p className="text-muted-foreground">{job.issueDescription}</p>
                      {job.address ? (
                        <p className="text-xs text-muted-foreground">Landmark: {job.address}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {job.distanceLabel} away · ~{job.etaMinutes} min
                      </p>
                      {job.aiTriage ? <TriageNote text={job.aiTriage} /> : null}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => act(job.id, "accept")}
                      disabled={busy}
                      className="bg-amber-500 text-white hover:bg-amber-600"
                    >
                      Accept
                    </Button>
                  </div>
                </div>
              ))
            : null}
        </CardContent>
      </Card>
    </div>
  );
}
