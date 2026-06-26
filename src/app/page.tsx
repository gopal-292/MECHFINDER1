import Link from "next/link";
import Image from "next/image";
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

      {/* Skills showcase */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="container py-16 md:py-20">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-sm uppercase tracking-widest text-amber-600">
              Real skills, on the spot
            </p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              Whatever stops you, they fix it
            </h2>
            <p className="mt-3 text-slate-600">
              Every mechanic on WebMech is hands-on and road-tested — from dead batteries to
              flat tyres to engine trouble.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Showcase
              src="/showcase/mechanic-engine.jpg"
              title="Engine repairs"
              body="On-site diagnosis and fixes for stalls, overheating, and breakdowns."
            />
            <Showcase
              src="/showcase/mechanic-tyre.jpg"
              title="Tyre & wheel"
              body="Flat tyre changes, punctures, and roadside wheel swaps in minutes."
            />
            <Showcase
              src="/showcase/mechanic-diagnostic.jpg"
              title="Diagnostics & battery"
              body="Scan tools to read fault codes, plus jump-starts for dead batteries."
            />
          </div>

          <div className="mt-10 flex justify-center">
            <Button asChild size="lg" className="bg-amber-400 text-slate-950 hover:bg-amber-300">
              <Link href="/signup">Find a mechanic near you</Link>
            </Button>
          </div>
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

function Showcase({ src, title, body }: { src: string; title: string; body: string }) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={src}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="p-5">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{body}</p>
      </div>
    </div>
  );
}
