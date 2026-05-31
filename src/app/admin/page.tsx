import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-xl font-bold">WebMech Admin</h1>
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

      <section className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Approval queue</CardTitle>
            <CardDescription>
              Coming in the next iteration — list of pending mechanics + approve / reject actions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Hi {session.user.name}. The admin tooling will appear here once the mechanic
              approval API is wired in.
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
