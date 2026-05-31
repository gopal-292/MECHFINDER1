"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const VEHICLE_TYPES = ["Bike", "Car", "Auto", "Truck", "Other"] as const;

type GeoState =
  | { status: "loading" }
  | { status: "ready"; lat: number; lng: number }
  | { status: "error"; message: string };

type NearbyMechanic = {
  id: string;
  name: string;
  distanceLabel: string;
  etaMinutes: number;
};

export default function NewRequestPage() {
  const router = useRouter();
  const [geo, setGeo] = useState<GeoState>({ status: "loading" });
  const [vehicleType, setVehicleType] = useState<string>("Car");
  const [vehicleModel, setVehicleModel] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [address, setAddress] = useState("");
  const [nearby, setNearby] = useState<NearbyMechanic[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function captureLocation() {
    setGeo({ status: "loading" });
    if (!("geolocation" in navigator)) {
      setGeo({ status: "error", message: "Geolocation isn't supported on this device." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          status: "ready",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        setGeo({
          status: "error",
          message:
            err.code === err.PERMISSION_DENIED
              ? "Location permission denied. Enable it to find nearby mechanics."
              : "Couldn't get your location. Try again.",
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  useEffect(() => {
    captureLocation();
  }, []);

  // Look up nearby mechanics once we have a location.
  useEffect(() => {
    if (geo.status !== "ready") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/mechanics/nearby?lat=${geo.lat}&lng=${geo.lng}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setNearby(data.mechanics ?? []);
      } catch {
        /* non-critical */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [geo]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (geo.status !== "ready") {
      setError("We need your location before sending help.");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: geo.lat,
          longitude: geo.lng,
          address: address || undefined,
          vehicleType,
          vehicleModel: vehicleModel || undefined,
          issueDescription,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 409 && data?.requestId) {
        router.push(`/dashboard/track/${data.requestId}`);
        return;
      }
      if (!res.ok) {
        setError(data?.error ?? "Could not send your request.");
        return;
      }

      router.push(`/dashboard/track/${data.requestId}`);
      router.refresh();
    });
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="container flex items-center justify-between py-4">
          <Link href="/dashboard" className="text-xl font-bold">
            WebMech
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">Cancel</Link>
          </Button>
        </div>
      </header>

      <section className="container max-w-2xl py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Request roadside help</h1>
          <p className="text-muted-foreground">
            Tell us what&apos;s wrong — we&apos;ll alert mechanics near you.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your location</CardTitle>
            <CardDescription>
              {geo.status === "loading" && "Getting your GPS position…"}
              {geo.status === "ready" &&
                `Locked in: ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}`}
              {geo.status === "error" && geo.message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {geo.status === "ready" ? (
              <div className="overflow-hidden rounded-md border">
                <iframe
                  title="Your location"
                  className="h-48 w-full"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${geo.lng - 0.01}%2C${geo.lat - 0.01}%2C${geo.lng + 0.01}%2C${geo.lat + 0.01}&layer=mapnik&marker=${geo.lat}%2C${geo.lng}`}
                />
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={captureLocation}>
                {geo.status === "loading" ? "Locating…" : "Retry location"}
              </Button>
            )}

            {nearby ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {nearby.length > 0
                  ? `${nearby.length} mechanic${nearby.length === 1 ? "" : "s"} available nearby — closest is ${nearby[0].distanceLabel} away (~${nearby[0].etaMinutes} min).`
                  : "No mechanics are available in your area right now, but we'll still post your request."}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <form className="mt-6 space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="vehicleType">Vehicle type</Label>
            <div className="flex flex-wrap gap-2">
              {VEHICLE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setVehicleType(t)}
                  className={
                    "rounded-full border px-4 py-1.5 text-sm transition-colors " +
                    (vehicleType === t
                      ? "border-amber-500 bg-amber-500 text-white"
                      : "border-input bg-background hover:bg-accent")
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicleModel">Vehicle model (optional)</Label>
            <Input
              id="vehicleModel"
              placeholder="e.g. Honda Activa, Maruti Swift"
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issueDescription">What&apos;s the problem?</Label>
            <textarea
              id="issueDescription"
              required
              minLength={3}
              rows={4}
              placeholder="e.g. Flat tyre on the highway, no spare. / Battery dead, won't start."
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Landmark / address (optional)</Label>
            <Input
              id="address"
              placeholder="Helps the mechanic find you faster"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="w-full bg-amber-500 text-white hover:bg-amber-600"
            disabled={isPending || geo.status !== "ready"}
          >
            {isPending ? "Sending…" : "Send request"}
          </Button>
        </form>
      </section>
    </main>
  );
}
