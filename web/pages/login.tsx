import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useState } from "react";
import { signInWithIdentifier, useOptionalAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useOptionalAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.replace("/app");
  }, [authLoading, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error: err } = await signInWithIdentifier(identifier, password);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/app");
  }

  return (
    <div className="paper-atmosphere flex min-h-screen flex-col">
      <Head>
        <title>Log in · Ethan&apos;s Tools</title>
      </Head>
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-6 py-5">
        <Link href="/" className="font-display text-sm font-semibold text-ink">
          Ethan&apos;s Tools
        </Link>
        <Link href="/signup" className="text-sm text-mint hover:underline">
          Sign up
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-16">
        <h1 className="font-display text-3xl font-bold text-ink">Welcome back</h1>
        <p className="mt-2 text-sm text-muted">
          Log in with your email or username.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
              Email or username
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-ink outline-none ring-mint/40 focus:ring-2"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-ink outline-none ring-mint/40 focus:ring-2"
              autoComplete="current-password"
            />
          </div>
          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-ink py-3 text-sm font-semibold text-paper transition hover:bg-ink/90 disabled:opacity-60"
          >
            {saving ? "Logging in…" : "Log in"}
          </button>
        </form>
      </main>
    </div>
  );
}
