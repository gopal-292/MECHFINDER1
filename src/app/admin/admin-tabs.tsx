"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";

export type AdminRequest = {
  id: string;
  status: string;
  vehicleType: string | null;
  issueDescription: string;
  userName: string;
  mechanicName: string | null;
  createdAt: string;
};

type AdminMechanic = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  specializations: string | null;
  vehicleTypes: string | null;
  serviceRadiusKm: number;
  isApproved: boolean;
  isAvailable: boolean;
  jobCount: number;
  reviewCount: number;
};

function formatDate(d: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(d));
}

export function AdminTabs({ requests }: { requests: AdminRequest[] }) {
  const [mechanics, setMechanics] = useState<AdminMechanic[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/mechanics", { cache: "no-store" });
      if (!res.ok) {
        setError("Could not load mechanics.");
        return;
      }
      const data = await res.json();
      setMechanics(data.mechanics);
      setError(null);
    } catch {
      setError("Network error.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(mechanicId: string, action: "approve" | "reject") {
    setBusyId(mechanicId);
    setError(null);
    try {
      const res = await fetch("/api/admin/mechanics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mechanicId, action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Action failed.");
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const pending = mechanics?.filter((m) => !m.isApproved) ?? [];
  const approved = mechanics?.filter((m) => m.isApproved) ?? [];

  function count(n: number | null): string {
    return n === null ? "…" : String(n);
  }

  return (
    <Tabs defaultValue="requests" className="w-full">
      <TabsList className="grid w-full max-w-xl grid-cols-3">
        <TabsTrigger value="requests">Requests ({requests.length})</TabsTrigger>
        <TabsTrigger value="pending">
          Pending ({count(mechanics ? pending.length : null)})
        </TabsTrigger>
        <TabsTrigger value="approved">
          Approved ({count(mechanics ? approved.length : null)})
        </TabsTrigger>
      </TabsList>

      {error ? (
        <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {/* Requests */}
      <TabsContent value="requests">
        <Card>
          <CardHeader>
            <CardTitle>Service requests</CardTitle>
            <CardDescription>Latest 25 across the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No requests yet.</p>
            ) : (
              requests.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-white p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {r.vehicleType ?? "Vehicle"} · {r.userName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.issueDescription}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.mechanicName ? `Mechanic: ${r.mechanicName} · ` : "Unassigned · "}
                      {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Pending approvals */}
      <TabsContent value="pending">
        <Card>
          <CardHeader>
            <CardTitle>Pending approval</CardTitle>
            <CardDescription>
              {mechanics === null
                ? "Loading mechanics…"
                : pending.length === 0
                  ? "No mechanics waiting for review."
                  : `${pending.length} mechanic${pending.length === 1 ? "" : "s"} awaiting approval.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.map((m) => (
              <MechanicRow
                key={m.id}
                m={m}
                busy={busyId === m.id}
                onApprove={() => act(m.id, "approve")}
                onReject={() => act(m.id, "reject")}
              />
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Approved mechanics */}
      <TabsContent value="approved">
        <Card>
          <CardHeader>
            <CardTitle>Approved mechanics</CardTitle>
            <CardDescription>
              {mechanics === null
                ? "Loading mechanics…"
                : approved.length === 0
                  ? "None yet."
                  : `${approved.length} active on the platform.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {approved.map((m) => (
              <MechanicRow
                key={m.id}
                m={m}
                busy={busyId === m.id}
                onReject={() => act(m.id, "reject")}
              />
            ))}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function MechanicRow({
  m,
  busy,
  onApprove,
  onReject,
}: {
  m: AdminMechanic;
  busy: boolean;
  onApprove?: () => void;
  onReject: () => void;
}) {
  return (
    <div className="rounded-md border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="text-sm">
          <div className="flex items-center gap-2">
            <p className="font-medium">{m.name}</p>
            {m.isApproved ? (
              <span
                className={
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
                  (m.isAvailable ? "bg-green-100 text-green-900" : "bg-slate-200 text-slate-700")
                }
              >
                {m.isAvailable ? "Online" : "Offline"}
              </span>
            ) : null}
          </div>
          <p className="text-muted-foreground">{m.email}</p>
          {m.phone ? <p className="text-muted-foreground">{m.phone}</p> : null}
          {m.specializations ? (
            <p className="mt-1 text-xs text-muted-foreground">Skills: {m.specializations}</p>
          ) : null}
          {m.vehicleTypes ? (
            <p className="text-xs text-muted-foreground">Vehicles: {m.vehicleTypes}</p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {m.serviceRadiusKm} km radius · {m.jobCount} jobs · {m.reviewCount} reviews
          </p>
          {m.bio ? <p className="mt-1 text-xs italic text-muted-foreground">“{m.bio}”</p> : null}
        </div>
        <div className="flex gap-2">
          {onApprove ? (
            <Button
              size="sm"
              onClick={onApprove}
              disabled={busy}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              Approve
            </Button>
          ) : null}
          <Button size="sm" variant="destructive" onClick={onReject} disabled={busy}>
            {m.isApproved ? "Revoke" : "Reject"}
          </Button>
        </div>
      </div>
    </div>
  );
}
