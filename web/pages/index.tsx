
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import CircularText from "@/components/tools/CircularText";
import { useOptionalAuth } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useOptionalAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/app");
    }
  }, [loading, user, router]);

  return (
    <div className="paper-atmosphere min-h-screen">
      <Head>
        <title>Ethan&apos;s Tools</title>
        <meta
          name="description"
          content="Personal tools for todos, finances, and health — built for clarity and daily rhythm."
        />
      </Head>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="font-display text-sm font-semibold tracking-wide text-ink/50">
          Ethan&apos;s Tools
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-medium text-ink/70 transition hover:text-ink"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink/90"
          >
            Sign up
          </Link>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col items-center justify-center gap-10 px-6 pb-16 pt-4 lg:flex-row lg:gap-20 lg:pb-24">
        <div className="animate-fade-up flex shrink-0 justify-center">
          <CircularText text="Ethan's Tools" radius={150} />
        </div>

        <div className="max-w-md text-center lg:text-left">
          <h1 className="animate-fade-up font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Tools that keep pace with your day
          </h1>
          <p className="animate-fade-up-delay mt-5 text-base leading-relaxed text-muted sm:text-lg">
            Three focused trackers — todos with a flexible backlog, finances
            that unite accounts and recurring costs, and a health calendar for
            food, energy, and goals.
          </p>
          <div className="animate-fade-up-delay-2 mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link
              href="/signup"
              className="rounded-full bg-mint px-6 py-3 text-sm font-semibold text-paper shadow-[0_8px_30px_rgba(45,212,168,0.35)] transition hover:brightness-105"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-ink/15 bg-surface px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink/30"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
