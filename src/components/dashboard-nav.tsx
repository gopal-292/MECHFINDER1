import Link from "next/link";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export function DashboardNav({
  email,
  active = "home",
}: {
  email?: string | null;
  active?: "home" | "profile";
}) {
  return (
    <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur">
      <div className="container flex items-center justify-between py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-amber-400 text-slate-950">
              W
            </span>
            WebMech
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <NavLink href="/dashboard" current={active === "home"}>
              Home
            </NavLink>
            <NavLink href="/dashboard/profile" current={active === "profile"}>
              Profile
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {email ? (
            <span className="hidden text-muted-foreground md:inline">{email}</span>
          ) : null}
          <Button asChild size="sm" className="bg-amber-500 text-white hover:bg-amber-600">
            <Link href="/dashboard/request">Get Help</Link>
          </Button>
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
  );
}

function NavLink({
  href,
  current,
  children,
}: {
  href: string;
  current: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
        (current
          ? "bg-slate-100 text-slate-900"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")
      }
    >
      {children}
    </Link>
  );
}
