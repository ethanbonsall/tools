import Head from "next/head";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Flame,
  HeartPulse,
  ListTodo,
  Minus,
  Scale,
  Smile,
  Sparkles,
  Wallet,
} from "lucide-react";
import AppNav from "@/components/tools/AppNav";
import { useRequireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Todo = {
  id: number;
  title: string;
  completed: boolean;
  priority: number;
};

type Tx = {
  id: number;
  name: string;
  amount: number;
  is_income: boolean;
  counterparty: string | null;
};

type HealthLog = {
  log_date: string;
  energy_morning: number | null;
  energy_midday: number | null;
  energy_night: number | null;
  mood_morning: number | null;
  mood_midday: number | null;
  mood_night: number | null;
  activity: string | null;
};

function avg(...vals: (number | null | undefined)[]) {
  const nums = vals.filter((v): v is number => typeof v === "number");
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function TrendIcon({ delta }: { delta: number | null }) {
  if (delta == null || Math.abs(delta) < 0.05)
    return <Minus className="h-3.5 w-3.5 text-muted" />;
  if (delta > 0) return <ArrowUpRight className="h-3.5 w-3.5 text-mint" />;
  return <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />;
}

function Spark({ value, max = 5 }: { value: number | null; max?: number }) {
  const pct = value == null ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="spark-bar w-full">
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

function MiniBars({ values, max }: { values: number[]; max?: number }) {
  const hi = max ?? Math.max(...values, 1);
  return (
    <div className="flex h-10 items-end gap-1">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-mint/80 transition-all"
          style={{
            height: `${Math.max(8, (v / hi) * 100)}%`,
            opacity: 0.35 + (i / Math.max(values.length - 1, 1)) * 0.65,
          }}
        />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { userId, loading: authLoading } = useRequireAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [weightNow, setWeightNow] = useState<number | null>(null);
  const [weightGoal, setWeightGoal] = useState<number | null>(null);
  const [financeReady, setFinanceReady] = useState(false);
  const [healthReady, setHealthReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const today = todayISO();
    const weekStart = daysAgoISO(6);

    const [todoRes, txRes, logRes, profileRes, goalRes, financeRes] =
      await Promise.all([
        supabase
          .from("todos")
          .select("id,title,completed,priority")
          .eq("user_id", userId)
          .eq("task_date", today)
          .order("priority", { ascending: true }),
        supabase
          .from("transactions")
          .select("id,name,amount,is_income,counterparty")
          .eq("user_id", userId)
          .eq("date", today)
          .order("id", { ascending: false }),
        supabase
          .from("health_daily_logs")
          .select(
            "log_date,energy_morning,energy_midday,energy_night,mood_morning,mood_midday,mood_night,activity"
          )
          .eq("user_id", userId)
          .gte("log_date", weekStart)
          .order("log_date", { ascending: true }),
        supabase
          .from("health_profiles")
          .select("current_weight,onboarded_at")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("health_weight_goals")
          .select("target_weight")
          .eq("user_id", userId)
          .eq("hit", false)
          .order("target_date", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("finance_profiles")
          .select("onboarded_at")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

    setTodos((todoRes.data ?? []) as Todo[]);
    setTxs((txRes.data ?? []) as Tx[]);
    setLogs((logRes.data ?? []) as HealthLog[]);
    setWeightNow(
      profileRes.data?.current_weight != null
        ? Number(profileRes.data.current_weight)
        : null
    );
    setWeightGoal(
      goalRes.data?.target_weight != null
        ? Number(goalRes.data.target_weight)
        : null
    );
    setFinanceReady(Boolean(financeRes.data?.onboarded_at));
    setHealthReady(Boolean(profileRes.data?.onboarded_at));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) load();
  }, [userId, load]);

  const todoDone = todos.filter((t) => t.completed).length;
  const todoTotal = todos.length;
  const todoPct = todoTotal ? (todoDone / todoTotal) * 100 : 0;
  const allTodosDone = todoTotal > 0 && todoDone === todoTotal;
  const incompleteTodos = todos.filter((t) => !t.completed);

  async function toggleTodo(todo: Todo) {
    const next = !todo.completed;
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, completed: next } : t))
    );
    const { error } = await supabase
      .from("todos")
      .update({ completed: next })
      .eq("id", todo.id);
    if (error) {
      setTodos((prev) =>
        prev.map((t) =>
          t.id === todo.id ? { ...t, completed: todo.completed } : t
        )
      );
    }
  }

  const spent = useMemo(
    () =>
      txs
        .filter((t) => !t.is_income)
        .reduce((s, t) => s + Number(t.amount), 0),
    [txs]
  );
  const income = useMemo(
    () =>
      txs
        .filter((t) => t.is_income)
        .reduce((s, t) => s + Number(t.amount), 0),
    [txs]
  );
  const net = income - spent;

  const latest = logs[logs.length - 1] ?? null;
  const prev = logs.length > 1 ? logs[logs.length - 2] : null;

  const moodNow = latest
    ? avg(latest.mood_morning, latest.mood_midday, latest.mood_night)
    : null;
  const moodPrev = prev
    ? avg(prev.mood_morning, prev.mood_midday, prev.mood_night)
    : null;
  const energyNow = latest
    ? avg(latest.energy_morning, latest.energy_midday, latest.energy_night)
    : null;
  const energyPrev = prev
    ? avg(prev.energy_morning, prev.energy_midday, prev.energy_night)
    : null;

  const moodSeries = logs.map(
    (l) => avg(l.mood_morning, l.mood_midday, l.mood_night) ?? 0
  );
  const energySeries = logs.map(
    (l) => avg(l.energy_morning, l.energy_midday, l.energy_night) ?? 0
  );
  const activityDays = logs.filter((l) => l.activity && l.activity.trim()).length;

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

  if (authLoading) {
    return (
      <div className="dashboard-shell flex min-h-screen items-center justify-center text-muted">
        …
      </div>
    );
  }

  return (
    <div className="dashboard-shell pb-24 md:pb-10">
      <Head>
        <title>Dashboard · Ethan&apos;s Tools</title>
      </Head>
      <AppNav />

      <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="mb-6 flex items-end justify-between animate-fade-up">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
              {greet}
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {new Date().toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </h1>
          </div>
          {loading ? (
            <span className="text-xs text-muted">…</span>
          ) : null}
        </div>

        <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Todos — check off in place; empty area opens /todo */}
          <div className="panel animate-fade-up relative flex flex-col overflow-hidden p-4 transition hover:border-mint/40 sm:p-5 md:col-span-1">
            <Link
              href="/todo"
              className="absolute inset-0 z-0"
              aria-label="Open todos"
            />

            <div className="relative z-10 flex items-center justify-between pointer-events-none">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-mint">
                <ListTodo className="h-4 w-4" />
              </div>
              <span className="font-display text-2xl font-bold tabular-nums text-ink">
                {todoDone}
                <span className="text-muted">/{todoTotal || 0}</span>
              </span>
            </div>

            <div className="relative z-0 mt-4 spark-bar pointer-events-none">
              <span
                style={{
                  width: `${allTodosDone ? 100 : todoPct}%`,
                }}
              />
            </div>

            {todoTotal === 0 ? (
              <div className="relative z-0 mt-6 flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center pointer-events-none">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-paper/40 text-muted">
                  <ListTodo className="h-5 w-5" />
                </div>
                <p className="font-display text-sm font-semibold text-ink">
                  Set your todos for today
                </p>
                <p className="text-xs text-muted">Plan the day in a few taps</p>
              </div>
            ) : allTodosDone ? (
              <div className="relative z-0 mt-6 flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center pointer-events-none">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-mint/40 bg-mint/10 text-mint">
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="font-display text-sm font-semibold text-mint">
                  All tasks done for today
                </p>
              </div>
            ) : (
              <ul className="relative z-10 mt-4 flex-1 space-y-1">
                {(incompleteTodos.length ? incompleteTodos : todos)
                  .slice(0, 6)
                  .map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleTodo(t);
                        }}
                        className="relative z-10 flex w-full items-center gap-2.5 rounded-xl px-1.5 py-2 text-left text-sm text-ink/90 transition hover:bg-paper/60"
                      >
                        {t.completed ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-mint" />
                        ) : (
                          <Circle className="h-5 w-5 shrink-0 text-muted" />
                        )}
                        <span
                          className={
                            t.completed
                              ? "truncate line-through text-muted"
                              : "truncate"
                          }
                        >
                          {t.title}
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {/* Finances */}
          <Link
            href="/finances"
            className="panel group animate-fade-up-delay flex flex-col overflow-hidden p-4 transition hover:border-mint/40 sm:p-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-mint">
                <Wallet className="h-4 w-4" />
              </div>
              {!financeReady || txs.length === 0 ? (
                <span className="text-xs font-medium uppercase tracking-wider text-muted">
                  Finances
                </span>
              ) : (
                <span
                  className={`font-display text-2xl font-bold tabular-nums ${
                    net >= 0 ? "text-mint" : "text-ink"
                  }`}
                >
                  {net >= 0 ? "+" : "-"}${Math.abs(net).toFixed(0)}
                </span>
              )}
            </div>

            {!financeReady ? (
              <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-paper/40 text-muted transition group-hover:border-mint/40 group-hover:text-mint">
                  <Wallet className="h-5 w-5" />
                </div>
                <p className="font-display text-sm font-semibold text-ink">
                  Set up your finances
                </p>
                <p className="text-xs text-muted">
                  Accounts, cashflow, and daily spend
                </p>
              </div>
            ) : txs.length === 0 ? (
              <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-paper/40 text-muted transition group-hover:border-mint/40 group-hover:text-mint">
                  <Wallet className="h-5 w-5" />
                </div>
                <p className="font-display text-sm font-semibold text-ink">
                  Log today&apos;s spending
                </p>
                <p className="text-xs text-muted">Nothing recorded yet today</p>
              </div>
            ) : (
              <>
                <div className="mt-4 flex gap-3 text-xs tabular-nums">
                  <span className="rounded-full border border-line px-2.5 py-1 text-mint">
                    +${income.toFixed(0)}
                  </span>
                  <span className="rounded-full border border-line px-2.5 py-1 text-muted">
                    −${spent.toFixed(0)}
                  </span>
                </div>

                <ul className="mt-4 flex-1 space-y-2">
                  {txs.slice(0, 5).map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="truncate text-ink/90">
                        {t.counterparty || t.name}
                      </span>
                      <span
                        className={`shrink-0 tabular-nums font-medium ${
                          t.is_income ? "text-mint" : "text-ink"
                        }`}
                      >
                        {t.is_income ? "+" : "−"}
                        {Number(t.amount).toFixed(0)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Link>

          {/* Health */}
          <Link
            href="/health"
            className="panel group animate-fade-up-delay-2 flex flex-col overflow-hidden p-4 transition hover:border-mint/40 sm:p-5 md:col-span-2 lg:col-span-1"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-mint">
                <HeartPulse className="h-4 w-4" />
              </div>
              {healthReady ? (
                <div className="flex items-center gap-1 text-xs text-muted">
                  <Flame className="h-3.5 w-3.5 text-mint" />
                  {activityDays}/7
                </div>
              ) : (
                <span className="text-xs font-medium uppercase tracking-wider text-muted">
                  Health
                </span>
              )}
            </div>

            {!healthReady ? (
              <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-paper/40 text-muted transition group-hover:border-mint/40 group-hover:text-mint">
                  <HeartPulse className="h-5 w-5" />
                </div>
                <p className="font-display text-sm font-semibold text-ink">
                  Set up your health
                </p>
                <p className="text-xs text-muted">
                  Goals, check-ins, and daily energy
                </p>
              </div>
            ) : logs.length === 0 ? (
              <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-paper/40 text-muted transition group-hover:border-mint/40 group-hover:text-mint">
                  <HeartPulse className="h-5 w-5" />
                </div>
                <p className="font-display text-sm font-semibold text-ink">
                  Check in for today
                </p>
                <p className="text-xs text-muted">
                  Log mood, energy, and activity
                </p>
              </div>
            ) : (
              <>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-line bg-paper/40 p-3">
                    <div className="flex items-center justify-between">
                      <Smile className="h-3.5 w-3.5 text-muted" />
                      <TrendIcon
                        delta={
                          moodNow != null && moodPrev != null
                            ? moodNow - moodPrev
                            : null
                        }
                      />
                    </div>
                    <div className="mt-2 font-display text-xl font-bold tabular-nums">
                      {moodNow != null ? moodNow.toFixed(1) : "—"}
                    </div>
                    <div className="mt-2">
                      <Spark value={moodNow} />
                    </div>
                    {moodSeries.length > 1 ? (
                      <div className="mt-3">
                        <MiniBars values={moodSeries} max={5} />
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-line bg-paper/40 p-3">
                    <div className="flex items-center justify-between">
                      <Activity className="h-3.5 w-3.5 text-muted" />
                      <TrendIcon
                        delta={
                          energyNow != null && energyPrev != null
                            ? energyNow - energyPrev
                            : null
                        }
                      />
                    </div>
                    <div className="mt-2 font-display text-xl font-bold tabular-nums">
                      {energyNow != null ? energyNow.toFixed(1) : "—"}
                    </div>
                    <div className="mt-2">
                      <Spark value={energyNow} />
                    </div>
                    {energySeries.length > 1 ? (
                      <div className="mt-3">
                        <MiniBars values={energySeries} max={5} />
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-paper/40 px-3 py-2.5">
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <Scale className="h-3.5 w-3.5" />
                    <span className="tabular-nums text-ink">
                      {weightNow != null ? weightNow : "—"}
                    </span>
                    {weightGoal != null ? (
                      <span className="text-xs text-muted">→ {weightGoal}</span>
                    ) : null}
                  </div>
                  {latest?.activity ? (
                    <span className="max-w-[45%] truncate text-xs text-mint">
                      {latest.activity}
                    </span>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </div>
              </>
            )}
          </Link>
        </div>
      </main>
    </div>
  );
}
