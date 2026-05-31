"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Role = "USER" | "MECHANIC" | "ADMIN";

const homeForRole = (role: Role) =>
  role === "ADMIN" ? "/admin" : role === "MECHANIC" ? "/mechanic/dashboard" : "/dashboard";

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const from = search.get("from");
  const [role, setRole] = useState<Role>("USER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!res || res.error) {
        setError("Invalid email or password.");
        return;
      }

      // We trust the chosen tab to route to; middleware will bounce if role mismatches.
      router.push(from && from !== "/login" ? from : homeForRole(role));
      router.refresh();
    });
  }

  return (
    <main className="container flex min-h-screen items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Pick your role and sign in</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={role} onValueChange={(v) => setRole(v as Role)} className="mb-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="USER">Driver</TabsTrigger>
              <TabsTrigger value="MECHANIC">Mechanic</TabsTrigger>
              <TabsTrigger value="ADMIN">Admin</TabsTrigger>
            </TabsList>
            <TabsContent value="USER" />
            <TabsContent value="MECHANIC" />
            <TabsContent value="ADMIN" />
          </Tabs>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>

          <div className="mt-6 rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Demo accounts</p>
            <ul className="mt-1 space-y-0.5">
              <li>admin@webmech.com / admin123</li>
              <li>user@demo.com / demo123</li>
              <li>mech@demo.com / demo123</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
