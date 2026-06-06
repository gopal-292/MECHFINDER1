import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="container flex items-center justify-between py-6">
        <div className="flex items-center gap-2 text-xl font-bold">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-amber-400 text-slate-950">
            W
          </span>
          WebMech
        </div>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" className="text-slate-700 hover:text-slate-900">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild className="bg-amber-400 text-slate-950 hover:bg-amber-300">
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </header>

      <section className="container grid gap-12 py-20 md:grid-cols-2 md:py-32">
        <div className="flex flex-col justify-center gap-6">
          <p className="text-sm uppercase tracking-widest text-amber-600">
            Roadside assistance, built for free
          </p>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            Broke down? <br />
            <span className="text-amber-600">Help is on the way.</span>
          </h1>
          <p className="max-w-prose text-lg text-slate-600">
            One tap sends your location to verified mechanics nearby. Watch them drive to you on
            a live map. Pay when the job is done.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-amber-400 text-slate-950 hover:bg-amber-300">
              <Link href="/signup">I&apos;m a driver</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-slate-300 bg-transparent text-slate-900 hover:bg-slate-100 hover:text-slate-950"
            >
              <Link href="/signup">I&apos;m a mechanic</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Feature title="Live map" body="See your mechanic moving toward you in real time." />
          <Feature title="Verified pros" body="Admin-approved mechanics only. No randoms." />
          <Feature title="Works anywhere" body="GPS + Leaflet + OpenStreetMap. No city limits." />
          <Feature title="Free to use" body="Built on free-tier infra. Zero monthly cost." />
        </div>
      </section>

      <footer className="container border-t border-slate-200 py-6 text-sm text-slate-500">
        Built with Next.js, Prisma, NextAuth, Tailwind. Free-tier everything.
      </footer>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="mb-1 text-lg font-semibold text-amber-600">{title}</h3>
      <p className="text-sm text-slate-600">{body}</p>
    </div>
  );
}
