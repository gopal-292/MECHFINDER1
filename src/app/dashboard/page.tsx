import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { DashboardNav } from "@/components/dashboard-nav";
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

  const completedCount = requests.filter((r) => r.status === "COMPLETED").length;
  const reviewsGiven = requests.filter((r) => r.review).length;
  const firstName = session.user.name?.split(" ")[0] ?? "there";

  const stats = [
    { label: "Total requests", value: requests.length },
    { label: "Completed", value: completedCount },
    { label: "Active now", value: active ? 1 : 0 },
    { label: "Reviews given", value: reviewsGiven },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <DashboardNav email={session.user.email} active="home" />

      {/* Hero */}
      <section className="border-b bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="container py-10 md:py-14">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <p className="text-sm uppercase tracking-widest text-amber-300">
                Welcome back
              </p>
              <h1 className="text-3xl font-bold leading-tight md:text-4xl">
                Hi {firstName} — what&apos;s up with your ride?
              </h1>
              <p className="max-w-prose text-slate-300">
                One tap shares your live location with verified mechanics nearby. Watch them
                drive to you on a live map and pay only when the job is done.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-amber-400 text-slate-950 hover:bg-amber-300"
                >
                  <Link href="/dashboard/request">Get Help now</Link>
                </Button>
                {active ? (
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-slate-500 bg-transparent text-white hover:bg-slate-700 hover:text-white"
                  >
                    <Link href={`/dashboard/track/${active.id}`}>Track active request</Link>
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                >
                  <p className="text-3xl font-bold">{s.value}</p>
                  <p className="text-sm text-slate-300">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container space-y-10 py-10">
        {/* Active request or Get Help prompt */}
        <div className="grid gap-6 lg:grid-cols-3">
          {active ? (
            <Card className="lg:col-span-2 border-blue-300 bg-blue-50">
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
                      Mechanic:{" "}
                      <span className="font-medium text-foreground">
                        {active.mechanic.user.name}
                      </span>
                    </p>
                  ) : null}
                </div>
                <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
                  <Link href={`/dashboard/track/${active.id}`}>Track live</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="lg:col-span-2 border-amber-300 bg-amber-50">
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

          {/* Account snapshot */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your account</CardTitle>
              <CardDescription>{session.user.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{session.user.name ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total trips</span>
                <span className="font-medium">{requests.length}</span>
              </div>
              <Button asChild variant="outline" className="mt-2 w-full">
                <Link href="/dashboard/profile">Manage profile</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Feature tiles — all features at a glance */}
        <div>
          <h2 className="mb-4 text-xl font-bold">Everything you can do</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureTile
              href="/dashboard/request"
              title="Get Help"
              body="Report a breakdown with one tap. GPS captured automatically."
              accent="amber"
            />
            <FeatureTile
              href={active ? `/dashboard/track/${active.id}` : "/dashboard/request"}
              title="Live tracking"
              body="Watch your mechanic move toward you on a real-time map."
              accent="blue"
            />
            <FeatureTile
              href="/dashboard/profile"
              title="Your profile"
              body="Update your name, phone, and password anytime."
              accent="violet"
            />
            <FeatureTile
              href="#history"
              title="Request history"
              body="Review past breakdowns and the ratings you left."
              accent="green"
            />
          </div>
        </div>

        {/* How it works */}
        <div>
          <h2 className="mb-4 text-xl font-bold">How it works</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: 1, t: "Tap Get Help", d: "Share your location and describe the issue." },
              { n: 2, t: "Mechanic accepts", d: "The closest verified pro picks up your job." },
              { n: 3, t: "Track live", d: "See them driving to you with a live ETA." },
              { n: 4, t: "Pay & rate", d: "Pay when done, then leave a rating." },
            ].map((s) => (
              <Card key={s.n}>
                <CardContent className="flex gap-3 p-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-700">
                    {s.n}
                  </span>
                  <div>
                    <p className="font-semibold">{s.t}</p>
                    <p className="text-sm text-muted-foreground">{s.d}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Vehicles we cover */}
        <div>
          <h2 className="mb-1 text-xl font-bold">We cover every vehicle</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Bikes, cars, autos, trucks — our verified mechanics handle them all.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <VehicleCard
              src="/showcase/vehicle-bike.jpg"
              type="Bike"
              body="Scooters & motorcycles"
            />
            <VehicleCard
              src="/showcase/vehicle-car.jpg"
              type="Car"
              body="Hatchbacks, sedans & SUVs"
            />
            <VehicleCard
              src="/showcase/vehicle-auto.jpg"
              type="Auto"
              body="Three-wheeler auto rickshaws"
            />
            <VehicleCard
              src="/showcase/vehicle-truck.jpg"
              type="Truck"
              body="Lorries & heavy vehicles"
            />
          </div>
        </div>

        {/* Request history */}
        <div id="history">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Request history</h2>
            <span className="text-sm text-muted-foreground">
              {history.length} {history.length === 1 ? "request" : "requests"}
            </span>
          </div>
          {history.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No past requests yet. Your breakdowns and ratings will show up here.
                </p>
                <Button
                  asChild
                  className="bg-amber-500 text-white hover:bg-amber-600"
                >
                  <Link href="/dashboard/request">Create your first request</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {history.map((r) => (
                <Link
                  key={r.id}
                  href={`/dashboard/track/${r.id}`}
                  className="block rounded-lg border bg-white p-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {r.vehicleType}
                      {r.vehicleModel ? ` · ${r.vehicleModel}` : ""}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {r.issueDescription}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDate(r.createdAt)}</span>
                    {r.review ? (
                      <span className="font-medium text-amber-600">
                        {"★".repeat(r.review.rating)}
                      </span>
                    ) : r.status === "COMPLETED" ? (
                      <span className="font-medium text-amber-600">Rate now</span>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t bg-white py-6 text-center text-sm text-muted-foreground">
        WebMech — roadside assistance, built for free.
      </footer>
    </main>
  );
}

function VehicleCard({
  src,
  type,
  body,
}: {
  src: string;
  type: string;
  body: string;
}) {
  return (
    <Link
      href={`/dashboard/request?vehicle=${encodeURIComponent(type)}`}
      className="group overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={src}
          alt={`${type} roadside service`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          {type}
        </span>
      </div>
      <div className="p-4">
        <p className="text-sm text-muted-foreground">{body}</p>
        <span className="mt-2 inline-block text-sm font-medium text-amber-600 transition-transform group-hover:translate-x-0.5">
          Get help for your {type.toLowerCase()} →
        </span>
      </div>
    </Link>
  );
}

function FeatureTile({
  href,
  title,
  body,
  accent,
}: {
  href: string;
  title: string;
  body: string;
  accent: "amber" | "blue" | "violet" | "green";
}) {
  const accents: Record<string, string> = {
    amber: "from-amber-50 to-white border-amber-200",
    blue: "from-blue-50 to-white border-blue-200",
    violet: "from-violet-50 to-white border-violet-200",
    green: "from-green-50 to-white border-green-200",
  };
  const dot: Record<string, string> = {
    amber: "bg-amber-400",
    blue: "bg-blue-400",
    violet: "bg-violet-400",
    green: "bg-green-400",
  };
  return (
    <Link
      href={href}
      className={`group block rounded-xl border bg-gradient-to-br p-5 transition-shadow hover:shadow-md ${accents[accent]}`}
    >
      <span className={`mb-3 inline-block h-2.5 w-2.5 rounded-full ${dot[accent]}`} />
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      <span className="mt-3 inline-block text-sm font-medium text-slate-900 transition-transform group-hover:translate-x-0.5">
        Open →
      </span>
    </Link>
  );
}
