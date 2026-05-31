import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { ACTIVE_STATUSES, STATUS_META } from "@/lib/geo";

export const dynamic = "force-dynamic";

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(d));
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const requests = await prisma.serviceRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      mechanic: { include: { user: { select: { name: true } } } },
      review: { select: { id: true, rating: true } },
    },
  });

  const active = requests.find((r) => ACTIVE_STATUSES.includes(r.status));
  const history = requests.filter((r) => r.id !== active?.id);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="container flex items-center justify-between py-4">
          <Link href="/" className="text-xl font-bold">
            WebMech
          </Link>
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

      <section className="container py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Hi {session.user.name?.split(" ")[0] ?? "there"} —
          </h1>
          <p className="text-muted-foreground">What&apos;s up with your ride?</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {active ? (
            <Card className="md:col-span-2 border-blue-300 bg-blue-50">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>Active request</CardTitle>
                  <StatusBadge status={active.status} />
                </div>
                <CardDescription>{STATUS_META[active.status].description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium">
                    {active.vehicleType}
                    {active.vehicleModel ? ` · ${active.vehicleModel}` : ""}
                  </p>
                  <p className="text-muted-foreground">{active.issueDescription}</p>
                  {active.mechanic ? (
                    <p className="mt-2 text-muted-foreground">
                      Mechanic: <span className="font-medium text-foreground">{active.mechanic.user.name}</span>
                    </p>
                  ) : null}
                </div>
                <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
                  <Link href={`/dashboard/track/${active.id}`}>Track live</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="md:col-span-2 border-amber-300 bg-amber-50">
              <CardHeader>
                <CardTitle>Need help right now?</CardTitle>
                <CardDescription>
                  Share your location and a nearby mechanic will respond within seconds.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  asChild
                  size="lg"
                  className="w-full bg-amber-500 text-white hover:bg-amber-600 sm:w-auto"
                >
                  <Link href="/dashboard/request">Get Help</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent requests</CardTitle>
              <CardDescription>
                {history.length === 0
                  ? "You haven't completed any yet."
                  : `${history.length} past ${history.length === 1 ? "request" : "requests"}.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Your past breakdowns and ratings will show up here.
                </p>
              ) : (
                history.slice(0, 6).map((r) => (
                  <Link
                    key={r.id}
                    href={`/dashboard/track/${r.id}`}
                    className="block rounded-md border bg-white p-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{r.vehicleType}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {r.issueDescription}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
