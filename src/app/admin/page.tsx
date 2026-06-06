import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { ACTIVE_STATUSES } from "@/lib/geo";
import { ApprovalQueue } from "./approval-queue";

export const dynamic = "force-dynamic";

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(d));
}

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [requests, counts] = await Promise.all([
    prisma.serviceRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        user: { select: { name: true } },
        mechanic: { include: { user: { select: { name: true } } } },
      },
    }),
    prisma.serviceRequest.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const totalRequests = counts.reduce((sum, c) => sum + c._count._all, 0);
  const activeCount = counts
    .filter((c) => ACTIVE_STATUSES.includes(c.status))
    .reduce((sum, c) => sum + c._count._all, 0);
  const completedCount =
    counts.find((c) => c.status === "COMPLETED")?._count._all ?? 0;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-xl font-bold">WebMech Admin</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{session.user.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button variant="ghost" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <section className="container space-y-8 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total requests" value={totalRequests} />
          <StatCard label="Active now" value={activeCount} />
          <StatCard label="Completed" value={completedCount} />
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold">Mechanic approvals</h2>
          <ApprovalQueue />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent requests</CardTitle>
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
                      {r.vehicleType ?? "Vehicle"} · {r.user.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{r.issueDescription}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.mechanic ? `Mechanic: ${r.mechanic.user.name} · ` : "Unassigned · "}
                      {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
