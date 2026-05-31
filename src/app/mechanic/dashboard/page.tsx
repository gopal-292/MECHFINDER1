import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MechanicDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-xl font-bold">WebMech Mechanic</h1>
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
      </header>

      <section className="container py-10 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Hi {session.user.name?.split(" ")[0]} —</h2>
          <p className="text-muted-foreground">You&apos;re approved and ready to take jobs.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nearby jobs</CardTitle>
            <CardDescription>None right now — sit tight.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Real-time job feed + accept button + GPS broadcast toggle ship in the next iteration.
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
