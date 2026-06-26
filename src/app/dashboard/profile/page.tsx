import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardNav } from "@/components/dashboard-nav";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "long" }).format(new Date(d));
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true, createdAt: true },
  });
  if (!user) return null;

  const [total, completed, reviews] = await Promise.all([
    prisma.serviceRequest.count({ where: { userId: session.user.id } }),
    prisma.serviceRequest.count({
      where: { userId: session.user.id, status: "COMPLETED" },
    }),
    prisma.review.count({ where: { userId: session.user.id } }),
  ]);

  const initials =
    user.name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "U";

  const stats = [
    { label: "Total requests", value: total },
    { label: "Completed", value: completed },
    { label: "Reviews given", value: reviews },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <DashboardNav email={session.user.email} active="profile" />

      <section className="container max-w-4xl py-10">
        <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-foreground">Profile</span>
        </div>

        {/* Profile header */}
        <Card className="mb-8 overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-slate-900 to-slate-700" />
          <CardContent className="p-6">
            <div className="-mt-16 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-white bg-amber-400 text-3xl font-bold text-slate-950 shadow">
                  {initials}
                </div>
                <div className="pb-1">
                  <h1 className="text-2xl font-bold">{user.name}</h1>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Member since {formatDate(user.createdAt)}
                  </p>
                </div>
              </div>
              <Button asChild variant="outline">
                <Link href="/dashboard/request">Get Help</Link>
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border bg-slate-50 p-4 text-center"
                >
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <ProfileForm
          initialName={user.name ?? ""}
          email={user.email}
          initialPhone={user.phone ?? ""}
        />
      </section>
    </main>
  );
}
