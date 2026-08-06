
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useState } from "react";
import { DEFAULT_APPEARANCE, appearanceToRow } from "@/lib/appearance";
import { supabase } from "@/lib/supabaseClient";
import { useOptionalAuth } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useOptionalAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
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

    const em = email.trim();
    const uname = username.trim();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: em,
      password,
    });

    if (signUpError) {
      setSaving(false);
      setError(signUpError.message);
      return;
    }

    const authUserId = data?.user?.id;
    if (authUserId) {
      const prefs = appearanceToRow(DEFAULT_APPEARANCE);
      const row = {
        user_id: authUserId,
        username: uname || null,
        email: em || null,
        ...prefs,
      };
      const { error: insertErr } = await supabase.from("users").insert(row);
      if (insertErr) {
        await supabase.from("users").upsert(row, { onConflict: "user_id" });
      }
    }

    setSaving(false);
    router.push("/app");
  }

  return (
    <div className="paper-atmosphere flex min-h-screen flex-col">
      <Head>
        <title>Sign up · Ethan&apos;s Tools</title>
      </Head>
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-6 py-5">
        <Link href="/" className="font-display text-sm font-semibold text-ink">
          Ethan&apos;s Tools
        </Link>
        <Link href="/login" className="text-sm text-mint hover:underline">
          Log in
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-16">
        <h1 className="font-display text-3xl font-bold text-ink">Create your account</h1>
        <p className="mt-2 text-sm text-muted">
          One account for todos, finances, and health.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-ink outline-none ring-mint/40 focus:ring-2"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-ink outline-none ring-mint/40 focus:ring-2"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-ink outline-none ring-mint/40 focus:ring-2"
              autoComplete="new-password"
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
            className="w-full rounded-full bg-mint py-3 text-sm font-semibold text-paper transition hover:brightness-105 disabled:opacity-60"
          >
            {saving ? "Creating…" : "Sign up"}
          </button>
        </form>
      </main>
    </div>
  );
}
