import Head from "next/head";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ArrowLeft, LogOut } from "lucide-react";
import AppNav from "@/components/tools/AppNav";
import { signOut, useRequireAuth } from "@/lib/auth";
import { useAppearance } from "@/context/themecontext";
import { DEFAULT_APPEARANCE } from "@/lib/appearance";
import { supabase } from "@/lib/supabaseClient";

export default function ProfilePage() {
  const router = useRouter();
  const { user, userId, loading } = useRequireAuth();
  const { appearance, setAppearance, resetAppearance } = useAppearance();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !user) return;
    setEmail(user.email ?? "");
    (async () => {
      const { data } = await supabase
        .from("users")
        .select("username,email")
        .eq("user_id", userId)
        .maybeSingle();
      if (data?.username) setUsername(data.username);
      if (data?.email) setEmail(data.email);
    })();
  }, [userId, user]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setErr(null);
    setMsg(null);
    const { error } = await supabase.from("users").upsert(
      {
        user_id: userId,
        username: username.trim() || null,
        email: email.trim() || user?.email || null,
      },
      { onConflict: "user_id" }
    );
    setSaving(false);
    if (error) setErr(error.message);
    else setMsg("Saved");
  }

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <div className="dashboard-shell flex min-h-screen items-center justify-center text-muted">
        …
      </div>
    );
  }

  return (
    <div className="dashboard-shell pb-24 md:pb-10">
      <Head>
        <title>Profile · Ethan&apos;s Tools</title>
      </Head>
      <AppNav />
      <main className="mx-auto max-w-lg px-4 py-6 sm:px-6">
        <div className="mb-8 flex items-center gap-3">
          <Link
            href="/app"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-tight">Profile</h1>
        </div>

        <form onSubmit={saveProfile} className="panel space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-ink outline-none focus:border-mint"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-ink outline-none focus:border-mint"
            />
          </div>
          {err ? <p className="text-sm text-red-400">{err}</p> : null}
          {msg ? <p className="text-sm text-mint">{msg}</p> : null}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-mint py-2.5 text-sm font-semibold text-paper disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </form>

        <section className="panel mt-5 space-y-5 p-5">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            Appearance
          </h2>

          <div className="grid grid-cols-3 gap-4">
            <label className="flex flex-col items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide text-muted">Background</span>
              <input
                type="color"
                value={appearance.background}
                onChange={(e) => setAppearance({ background: e.target.value })}
                className="h-12 w-12 cursor-pointer rounded-full border border-line bg-transparent p-0.5"
              />
            </label>
            <label className="flex flex-col items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide text-muted">Accent</span>
              <input
                type="color"
                value={appearance.accent}
                onChange={(e) => setAppearance({ accent: e.target.value })}
                className="h-12 w-12 cursor-pointer rounded-full border border-line bg-transparent p-0.5"
              />
            </label>
            <label className="flex flex-col items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide text-muted">Text</span>
              <input
                type="color"
                value={appearance.text}
                onChange={(e) => setAppearance({ text: e.target.value })}
                className="h-12 w-12 cursor-pointer rounded-full border border-line bg-transparent p-0.5"
              />
            </label>
          </div>

          <div
            className="rounded-xl border p-4"
            style={{
              background: appearance.background,
              borderColor: appearance.accent,
              color: appearance.text,
            }}
          >
            <div className="text-xs opacity-60">Preview</div>
            <div className="mt-1 font-display text-lg font-semibold">Ethan&apos;s Tools</div>
            <div
              className="mt-3 h-1.5 w-2/3 rounded-full"
              style={{ background: appearance.accent }}
            />
          </div>

          <button
            type="button"
            onClick={resetAppearance}
            className="w-full rounded-full border border-line py-2.5 text-sm text-muted hover:text-ink"
          >
            Reset to default
            <span className="ml-2 text-[10px] opacity-60">
              {DEFAULT_APPEARANCE.background} / {DEFAULT_APPEARANCE.accent}
            </span>
          </button>
        </section>

        <section className="panel mt-5 space-y-4 p-5">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            Todo week layout
          </h2>
          <p className="text-sm text-muted">
            Choose how days are arranged on phone and desktop.
          </p>

          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
              Mobile
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAppearance({ mobile: true })}
                className={[
                  "rounded-xl border px-3 py-3 text-left transition",
                  appearance.mobile
                    ? "border-mint bg-mint/10 text-ink"
                    : "border-line text-muted hover:text-ink",
                ].join(" ")}
              >
                <div className="text-sm font-medium text-ink">Stacked</div>
                <div className="mt-1 text-xs text-muted">Days on top of each other</div>
              </button>
              <button
                type="button"
                onClick={() => setAppearance({ mobile: false })}
                className={[
                  "rounded-xl border px-3 py-3 text-left transition",
                  !appearance.mobile
                    ? "border-mint bg-mint/10 text-ink"
                    : "border-line text-muted hover:text-ink",
                ].join(" ")}
              >
                <div className="text-sm font-medium text-ink">Scroll</div>
                <div className="mt-1 text-xs text-muted">Swipe across the week</div>
              </button>
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
              Desktop
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAppearance({ desktop: true })}
                className={[
                  "rounded-xl border px-3 py-3 text-left transition",
                  appearance.desktop
                    ? "border-mint bg-mint/10 text-ink"
                    : "border-line text-muted hover:text-ink",
                ].join(" ")}
              >
                <div className="text-sm font-medium text-ink">Side by side</div>
                <div className="mt-1 text-xs text-muted">Full week in columns</div>
              </button>
              <button
                type="button"
                onClick={() => setAppearance({ desktop: false })}
                className={[
                  "rounded-xl border px-3 py-3 text-left transition",
                  !appearance.desktop
                    ? "border-mint bg-mint/10 text-ink"
                    : "border-line text-muted hover:text-ink",
                ].join(" ")}
              >
                <div className="text-sm font-medium text-ink">Scroll</div>
                <div className="mt-1 text-xs text-muted">Swipe across the week</div>
              </button>
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-line py-3 text-sm text-muted hover:border-red-500/40 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </main>
    </div>
  );
}
