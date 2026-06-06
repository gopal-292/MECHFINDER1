import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { MechanicConsole } from "./mechanic-console";

export default async function MechanicDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-xl font-bold">WebMech Mechanic</h1>
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

      <section className="container py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Hi {session.user.name?.split(" ")[0]} —</h2>
          <p className="text-muted-foreground">Go online to start receiving nearby jobs.</p>
        </div>
        <MechanicConsole />
      </section>
    </main>
  );
}
