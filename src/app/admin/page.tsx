import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ACTIVE_STATUSES } from "@/lib/geo";
import { AdminTabs } from "./admin-tabs";

export const dynamic = "force-dynamic";

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

  const requestRows = requests.map((r) => ({
    id: r.id,
    status: r.status,
    vehicleType: r.vehicleType,
    issueDescription: r.issueDescription,
    userName: r.user.name,
    mechanicName: r.mechanic?.user.name ?? null,
    createdAt: r.createdAt.toISOString(),
  }));

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

        <AdminTabs requests={requestRows} />
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
