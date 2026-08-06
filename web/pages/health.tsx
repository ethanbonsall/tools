import Head from "next/head";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, LayoutDashboard, UtensilsCrossed, X } from "lucide-react";
import AppNav from "@/components/tools/AppNav";
import CalendarPanel from "@/components/health/CalendarPanel";
import DashboardPanel from "@/components/health/DashboardPanel";
import DayLogForm from "@/components/health/DayLogForm";
import SettingsPanel, { GoalDraft } from "@/components/health/SettingsPanel";
import { useRequireAuth } from "@/lib/auth";
import {
  DayDraft,
  DailyLog,
  Exercise,
  GoalType,
  HealthProfile,
  HealthTab,
  Meal,
  MealItem,
  MealType,
  WeightGoal,
  addDays,
  buildDayDraft,
  emptyDayDraft,
  endOfMonth,
  isWeightGoalHit,
  macroPercentTotal,
  macrosFromCaloriesAndPercents,
  monthGrid,
  parseDurationInput,
  parseISODate,
  startOfMonth,
  toISODate,
  todayISO,
  weekGrid,
} from "@/lib/health";
import { supabase } from "@/lib/supabaseClient";

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm focus:border-mint/50 focus:outline-none";

const TABS: { id: HealthTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "log", label: "Day log", icon: UtensilsCrossed },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
];

export default function HealthPage() {
  const { userId, loading: authLoading } = useRequireAuth();
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealItems, setMealItems] = useState<MealItem[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [goals, setGoals] = useState<WeightGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const initialLoad = useRef(true);

  const [activeSection, setActiveSection] = useState<HealthTab>("dashboard");
  const [showSettings, setShowSettings] = useState(false);
  const [calView, setCalView] = useState<"week" | "month">("month");
  const [calCursor, setCalCursor] = useState(() => new Date());
  const [popupDate, setPopupDate] = useState<string | null>(null);
  const scrollRef = useRef<HTMLElement>(null);
  const sectionRefs = useRef<Record<HealthTab, HTMLElement | null>>({
    dashboard: null,
    log: null,
    calendar: null,
  });

  function scrollToSection(id: HealthTab) {
    const el = sectionRefs.current[id];
    if (!el) return;
    setActiveSection(id);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const [logDate] = useState(todayISO());
  const [logDraft, setLogDraft] = useState<DayDraft>(emptyDayDraft);
  const [popupDraft, setPopupDraft] = useState<DayDraft>(emptyDayDraft);

  const [onboard, setOnboard] = useState({
    goal_type: "maintain" as GoalType,
    current_weight: "",
    calories_goal: "",
    protein_pct: "30",
    carbs_pct: "40",
    fat_pct: "30",
    deadline_title: "",
    deadline_date: "",
    deadline_notes: "",
  });
  const [onboardGoals, setOnboardGoals] = useState<
    { key: string; target_weight: string; target_date: string; reward: string }[]
  >([{ key: "g0", target_weight: "", target_date: "", reward: "" }]);

  const onboardCalories = Number(onboard.calories_goal) || 0;
  const onboardPercents = useMemo(
    () => ({
      protein: Number(onboard.protein_pct) || 0,
      carbs: Number(onboard.carbs_pct) || 0,
      fat: Number(onboard.fat_pct) || 0,
    }),
    [onboard.protein_pct, onboard.carbs_pct, onboard.fat_pct]
  );
  const onboardGrams = useMemo(
    () => macrosFromCaloriesAndPercents(onboardCalories, onboardPercents),
    [onboardCalories, onboardPercents]
  );
  const onboardPctTotal = macroPercentTotal(onboardPercents);

  const load = useCallback(async () => {
    if (!userId) return;
    const showSpinner = initialLoad.current;
    if (showSpinner) setLoading(true);
    setErr(null);
    try {
      const trendStart = toISODate(addDays(new Date(), -90));
      const calStart = toISODate(addDays(startOfMonth(calCursor), -7));
      const rangeStart = trendStart < calStart ? trendStart : calStart;
      const rangeEnd = toISODate(addDays(endOfMonth(calCursor), 14));

      const [p, l, g] = await Promise.all([
        supabase.from("health_profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase
          .from("health_daily_logs")
          .select("*")
          .eq("user_id", userId)
          .gte("log_date", rangeStart)
          .lte("log_date", rangeEnd)
          .order("log_date"),
        supabase
          .from("health_weight_goals")
          .select("*")
          .eq("user_id", userId)
          .order("target_date"),
      ]);

      if (p.error) throw p.error;
      if (l.error) throw l.error;
      if (g.error) throw g.error;

      const logRows = (l.data ?? []) as DailyLog[];
      setProfile((p.data as HealthProfile) ?? null);
      setLogs(logRows);
      setGoals((g.data ?? []) as WeightGoal[]);

      const logIds = logRows.map((row) => row.id);
      if (logIds.length === 0) {
        setMeals([]);
        setMealItems([]);
        setExercises([]);
        return;
      }

      const [m, ex] = await Promise.all([
        supabase.from("health_meals").select("*").in("daily_log_id", logIds),
        supabase.from("health_exercises").select("*").in("daily_log_id", logIds),
      ]);
      if (m.error) throw m.error;
      if (ex.error) throw ex.error;

      const mealRows = (m.data ?? []) as Meal[];
      setMeals(mealRows);
      setExercises((ex.data ?? []) as Exercise[]);

      const mealIds = mealRows.map((row) => row.id);
      if (mealIds.length > 0) {
        const items = await supabase
          .from("health_meal_items")
          .select("id, meal_id, description, sort_order")
          .in("meal_id", mealIds)
          .order("sort_order");
        if (items.error) throw items.error;
        setMealItems((items.data ?? []) as MealItem[]);
      } else {
        setMealItems([]);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load health.";
      setErr(
        msg.includes("relation") || msg.includes("schema cache")
          ? "Health tables need an update. Run supabase/migrations/004_health_day_log_v2.sql."
          : msg
      );
    } finally {
      initialLoad.current = false;
      if (showSpinner) setLoading(false);
    }
  }, [userId, calCursor]);

  useEffect(() => {
    if (userId) load();
  }, [userId, load]);

  const logsByDate = useMemo(() => {
    const map = new Map<string, DailyLog>();
    for (const log of logs) map.set(log.log_date, log);
    return map;
  }, [logs]);

  const mealsByLog = useMemo(() => {
    const map = new Map<number, Meal[]>();
    for (const meal of meals) {
      const list = map.get(meal.daily_log_id) ?? [];
      list.push(meal);
      map.set(meal.daily_log_id, list);
    }
    return map;
  }, [meals]);

  const itemsByMeal = useMemo(() => {
    const map = new Map<number, MealItem[]>();
    for (const item of mealItems) {
      const list = map.get(item.meal_id) ?? [];
      list.push(item);
      map.set(item.meal_id, list);
    }
    return map;
  }, [mealItems]);

  const exercisesByLog = useMemo(() => {
    const map = new Map<number, Exercise[]>();
    for (const ex of exercises) {
      const list = map.get(ex.daily_log_id) ?? [];
      list.push(ex);
      map.set(ex.daily_log_id, list);
    }
    return map;
  }, [exercises]);

  function draftForDate(iso: string): DayDraft {
    const log = logsByDate.get(iso);
    if (!log) return emptyDayDraft();
    const dayMeals = mealsByLog.get(log.id) ?? [];
    const dayItems = dayMeals.flatMap((m) => itemsByMeal.get(m.id) ?? []);
    const dayEx = exercisesByLog.get(log.id) ?? [];
    return buildDayDraft(log, dayMeals, dayItems, dayEx);
  }

  // Hydrate today’s log once when onboarded data is ready
  const logHydrated = useRef(false);
  useEffect(() => {
    if (!profile?.onboarded_at || loading || logHydrated.current) return;
    if (logs !== undefined) {
      setLogDraft(draftForDate(logDate));
      logHydrated.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.onboarded_at, loading, logs]);

  useEffect(() => {
    if (popupDate) setPopupDraft(draftForDate(popupDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupDate]);

  const needsOnboard = !profile?.onboarded_at;
  const cells = useMemo(
    () => (calView === "month" ? monthGrid(calCursor) : weekGrid(calCursor)),
    [calView, calCursor]
  );

  // Highlight left nav from which section box is in view
  useEffect(() => {
    if (needsOnboard) return;
    const scroller = scrollRef.current;
    if (!scroller) return;

    const idMap: Record<string, HealthTab> = {
      "health-dashboard": "dashboard",
      "health-log": "log",
      "health-calendar": "calendar",
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const tab = idMap[visible.target.id];
        if (tab) setActiveSection(tab);
      },
      { root: scroller, threshold: [0.35, 0.55, 0.75] }
    );

    for (const id of Object.keys(idMap)) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [needsOnboard, loading]);

  async function finishOnboard(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;
    if (!onboardCalories || onboardPctTotal !== 100) {
      setErr("Calories required; macros must total 100%.");
      return;
    }
    try {
      const grams = macrosFromCaloriesAndPercents(onboardCalories, onboardPercents);
      const { error } = await supabase.from("health_profiles").upsert({
        user_id: userId,
        goal_type: onboard.goal_type,
        current_weight: Number(onboard.current_weight) || null,
        protein_goal: grams.protein,
        carbs_goal: grams.carbs,
        fat_goal: grams.fat,
        calories_goal: onboardCalories,
        onboarded_at: new Date().toISOString(),
        last_checkin_prompt_date: null,
      });
      if (error) throw error;

      const goalRows = onboardGoals
        .filter((g) => g.target_weight && g.target_date)
        .map((g) => ({
          user_id: userId,
          target_weight: Number(g.target_weight),
          target_date: g.target_date,
          reward: g.reward.trim() || null,
        }));
      if (goalRows.length) {
        const { error: goalErr } = await supabase
          .from("health_weight_goals")
          .insert(goalRows);
        if (goalErr) throw goalErr;
      }
      if (onboard.deadline_title.trim() && onboard.deadline_date) {
        await supabase.from("health_events").insert({
          user_id: userId,
          title: onboard.deadline_title.trim(),
          event_date: onboard.deadline_date,
          notes: onboard.deadline_notes.trim() || null,
          is_deadline: true,
        });
      }
      setErr(null);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Onboarding failed.");
    }
  }

  async function saveDay(date: string, draft: DayDraft) {
    if (!userId) return;
    setSaving(true);
    setErr(null);
    try {
      const eM = Number(draft.breakfast.energy) || null;
      const eMid = Number(draft.lunch.energy) || null;
      const eN = Number(draft.dinner.energy) || null;
      const mood = Number(draft.mood) || null;

      const { data: log, error } = await supabase
        .from("health_daily_logs")
        .upsert(
          {
            user_id: userId,
            log_date: date,
            energy_morning: eM,
            energy_midday: eMid,
            energy_night: eN,
            mood_morning: mood,
            mood_midday: mood,
            mood_night: mood,
            mood_overall: mood,
            sleep_hours: draft.sleep_hours ? Number(draft.sleep_hours) : null,
            weight: draft.weight ? Number(draft.weight) : null,
            activity: null,
          },
          { onConflict: "user_id,log_date" }
        )
        .select("id")
        .single();
      if (error) throw error;

      // Replace meals (items cascade) and exercises for this log
      await supabase.from("health_meals").delete().eq("daily_log_id", log.id);
      await supabase.from("health_exercises").delete().eq("daily_log_id", log.id);

      const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
      for (const type of mealTypes) {
        const section = draft[type];
        const lines = section.items.map((s) => s.trim()).filter(Boolean);
        const hasMacros =
          section.calories || section.protein || section.carbs || section.fat;
        if (!lines.length && !hasMacros && type === "snack") continue;
        if (!lines.length && !hasMacros && !section.energy) continue;

        const { data: mealRow, error: mealErr } = await supabase
          .from("health_meals")
          .insert({
            user_id: userId,
            daily_log_id: log.id,
            meal_type: type,
            description: lines.join("; ") || null,
            calories: section.calories ? Number(section.calories) : null,
            protein: section.protein ? Number(section.protein) : null,
            carbs: section.carbs ? Number(section.carbs) : null,
            fat: section.fat ? Number(section.fat) : null,
            energy: type === "snack" ? null : Number(section.energy) || null,
          })
          .select("id")
          .single();
        if (mealErr) throw mealErr;

        if (lines.length) {
          const { error: itemErr } = await supabase.from("health_meal_items").insert(
            lines.map((description, sort_order) => ({
              user_id: userId,
              meal_id: mealRow.id,
              description,
              sort_order,
            }))
          );
          if (itemErr) throw itemErr;
        }
      }

      const exRows = draft.exercises
        .map((ex, sort_order) => ({
          user_id: userId,
          daily_log_id: log.id,
          activity_type: ex.activity_type.trim(),
          duration_minutes: parseDurationInput(ex.duration_minutes),
          sort_order,
        }))
        .filter((ex) => ex.activity_type);

      if (exRows.length) {
        const { error: exErr } = await supabase.from("health_exercises").insert(exRows);
        if (exErr) throw exErr;
      }

      if (profile && date === todayISO()) {
        await supabase.from("health_profiles").upsert({
          ...profile,
          user_id: userId,
          current_weight: draft.weight
            ? Number(draft.weight)
            : profile.current_weight,
          last_checkin_prompt_date: date,
        });
      }

      if (draft.weight && profile) {
        await markReachedWeightGoals(Number(draft.weight), profile.goal_type);
      }

      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to save day.");
      throw e;
    } finally {
      setSaving(false);
    }
  }

  async function markReachedWeightGoals(weight: number, goalType: GoalType) {
    if (!userId) return;
    const open = goals.filter((g) => !g.hit);
    for (const g of open) {
      if (!isWeightGoalHit(goalType, weight, Number(g.target_weight))) continue;
      await supabase
        .from("health_weight_goals")
        .update({ hit: true })
        .eq("id", g.id)
        .eq("user_id", userId);
    }
  }

  async function saveSettings(payload: {
    profile: Partial<HealthProfile>;
    goals: GoalDraft[];
  }) {
    if (!userId || !profile) return;
    const nextProfile = {
      ...profile,
      ...payload.profile,
      user_id: userId,
    };
    const { error } = await supabase.from("health_profiles").upsert(nextProfile);
    if (error) throw error;

    const goalType = (payload.profile.goal_type ?? profile.goal_type) as GoalType;
    const weight =
      payload.profile.current_weight != null
        ? Number(payload.profile.current_weight)
        : profile.current_weight != null
          ? Number(profile.current_weight)
          : null;

    for (const g of payload.goals) {
      if (g.remove && g.existingId) {
        const { error: delErr } = await supabase
          .from("health_weight_goals")
          .delete()
          .eq("id", g.existingId);
        if (delErr) throw delErr;
        continue;
      }
      if (g.remove) continue;
      if (!g.target_weight || !g.target_date) continue;

      const target = Number(g.target_weight);
      const existing = g.existingId
        ? goals.find((row) => row.id === g.existingId)
        : undefined;
      const hit =
        existing?.hit ||
        (weight != null && isWeightGoalHit(goalType, weight, target));

      const row = {
        user_id: userId,
        target_weight: target,
        target_date: g.target_date,
        reward: g.reward.trim() || null,
        hit,
      };

      if (g.existingId) {
        const { error: upErr } = await supabase
          .from("health_weight_goals")
          .update(row)
          .eq("id", g.existingId);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase
          .from("health_weight_goals")
          .insert(row);
        if (insErr) throw insErr;
      }
    }
    await load();
  }

  if (authLoading || loading) {
    return (
      <div className="dashboard-shell flex min-h-screen items-center justify-center text-muted">
        …
      </div>
    );
  }

  return (
    <div className="dashboard-shell flex h-[100dvh] flex-col overflow-hidden text-ink">
      <Head>
        <title>Health · Ethan&apos;s Tools</title>
      </Head>
      <AppNav />

      {err ? (
        <div className="mx-4 shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 md:mx-6">
          {err}
        </div>
      ) : null}

      {needsOnboard ? (
        <main className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 py-6">
          <form onSubmit={finishOnboard} className="space-y-6 pb-24 md:pb-8">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Health setup</h1>
              <p className="mt-1 text-muted">
                Set macros, a weight target, and an optional deadline.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium">Goal</label>
              <select
                value={onboard.goal_type}
                onChange={(e) =>
                  setOnboard({ ...onboard, goal_type: e.target.value as GoalType })
                }
                className={inputClass}
              >
                <option value="lose_weight">Lose weight</option>
                <option value="maintain">Keep track of health</option>
                <option value="gain_weight">Gain weight</option>
              </select>
              <input
                type="number"
                step="0.1"
                placeholder="Current weight"
                value={onboard.current_weight}
                onChange={(e) =>
                  setOnboard({ ...onboard, current_weight: e.target.value })
                }
                className={inputClass}
              />
              <input
                type="number"
                required
                placeholder="Daily calories"
                value={onboard.calories_goal}
                onChange={(e) =>
                  setOnboard({ ...onboard, calories_goal: e.target.value })
                }
                className={inputClass}
              />
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["protein_pct", "Protein %", onboardGrams.protein],
                    ["carbs_pct", "Carbs %", onboardGrams.carbs],
                    ["fat_pct", "Fat %", onboardGrams.fat],
                  ] as const
                ).map(([key, label, g]) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs text-muted">{label}</label>
                    <input
                      type="number"
                      value={onboard[key]}
                      onChange={(e) =>
                        setOnboard({ ...onboard, [key]: e.target.value })
                      }
                      className={inputClass}
                    />
                    <p className="mt-1 text-[11px] text-muted">{g}g</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted">Macro total: {onboardPctTotal}%</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">Weight goals</h2>
                  <p className="text-xs text-muted">Add multiple checkpoints if you want.</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setOnboardGoals((prev) => [
                      ...prev,
                      {
                        key: `g-${prev.length}-${Date.now()}`,
                        target_weight: "",
                        target_date: "",
                        reward: "",
                      },
                    ])
                  }
                  className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:text-ink"
                >
                  Add goal
                </button>
              </div>
              {onboardGoals.map((g, i) => (
                <div
                  key={g.key}
                  className="grid gap-2 rounded-xl border border-line bg-surface/50 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Target weight"
                    value={g.target_weight}
                    onChange={(e) =>
                      setOnboardGoals((prev) =>
                        prev.map((row) =>
                          row.key === g.key
                            ? { ...row, target_weight: e.target.value }
                            : row
                        )
                      )
                    }
                    className={inputClass}
                  />
                  <input
                    type="date"
                    value={g.target_date}
                    onChange={(e) =>
                      setOnboardGoals((prev) =>
                        prev.map((row) =>
                          row.key === g.key
                            ? { ...row, target_date: e.target.value }
                            : row
                        )
                      )
                    }
                    className={inputClass}
                  />
                  <input
                    placeholder="Reward"
                    value={g.reward}
                    onChange={(e) =>
                      setOnboardGoals((prev) =>
                        prev.map((row) =>
                          row.key === g.key ? { ...row, reward: e.target.value } : row
                        )
                      )
                    }
                    className={inputClass}
                  />
                  <button
                    type="button"
                    disabled={onboardGoals.length === 1}
                    onClick={() =>
                      setOnboardGoals((prev) =>
                        prev.length === 1 ? prev : prev.filter((row) => row.key !== g.key)
                      )
                    }
                    className="rounded-xl border border-line px-3 text-sm text-muted hover:text-ink disabled:opacity-30"
                    aria-label={`Remove goal ${i + 1}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <input
                placeholder="Deadline title"
                value={onboard.deadline_title}
                onChange={(e) =>
                  setOnboard({ ...onboard, deadline_title: e.target.value })
                }
                className={inputClass}
              />
              <input
                type="date"
                value={onboard.deadline_date}
                onChange={(e) =>
                  setOnboard({ ...onboard, deadline_date: e.target.value })
                }
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={onboardPctTotal !== 100 || !onboardCalories}
              className="w-full rounded-full bg-mint py-3 text-sm font-semibold text-paper disabled:opacity-50"
            >
              Open health
            </button>
          </form>
        </main>
      ) : (
        <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 gap-3 px-3 pb-20 pt-2 md:gap-4 md:px-5 md:pb-4">
          {/* Left circular nav — desktop only; scrolls to section boxes */}
          <nav className="sticky top-2 z-10 hidden shrink-0 flex-col items-center gap-3 self-start md:flex">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = activeSection === id;
              return (
                <button
                  key={id}
                  type="button"
                  title={label}
                  aria-label={label}
                  onClick={() => scrollToSection(id)}
                  className={`flex h-12 w-12 items-center justify-center rounded-full border transition ${
                    active
                      ? "border-mint bg-mint-soft text-mint ring-1 ring-mint/40"
                      : "border-line bg-surface/80 text-muted hover:text-ink"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
          </nav>

          {/* Snap-scroll between separate section boxes */}
          <main
            ref={scrollRef}
            className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-y-auto scroll-smooth snap-y snap-mandatory"
          >
            <section
              id="health-dashboard"
              ref={(el) => {
                sectionRefs.current.dashboard = el;
              }}
              className="flex min-h-[calc(100dvh-7.5rem)] shrink-0 snap-start snap-always flex-col overflow-hidden rounded-2xl border border-line bg-surface/80 p-4 sm:p-5"
            >
              {profile ? (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <DashboardPanel
                    profile={profile}
                    goals={goals}
                    logs={logs}
                    onOpenSettings={() => setShowSettings(true)}
                  />
                </div>
              ) : null}
            </section>

            <section
              id="health-log"
              ref={(el) => {
                sectionRefs.current.log = el;
              }}
              className="flex min-h-[calc(100dvh-7.5rem)] shrink-0 snap-start snap-always flex-col overflow-hidden rounded-2xl border border-line bg-surface/80 p-4 sm:p-5"
            >
              <DayLogForm
                date={logDate}
                draft={logDraft}
                onChange={setLogDraft}
                saving={saving}
                compact
                onSave={() => saveDay(logDate, logDraft)}
              />
            </section>

            <section
              id="health-calendar"
              ref={(el) => {
                sectionRefs.current.calendar = el;
              }}
              className="mb-1 flex min-h-[calc(100dvh-7.5rem)] shrink-0 snap-start snap-always flex-col overflow-hidden rounded-2xl border border-line bg-surface/80 p-4 sm:p-5"
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <CalendarPanel
                  calView={calView}
                  calCursor={calCursor}
                  cells={cells}
                  logsByDate={logsByDate}
                  onViewChange={setCalView}
                  onShift={(dir) => {
                    setCalCursor((prev) => {
                      if (calView === "month") {
                        return new Date(
                          prev.getFullYear(),
                          prev.getMonth() + dir,
                          1
                        );
                      }
                      return addDays(prev, dir * 7);
                    });
                  }}
                  onSelectDay={(iso) => {
                    setPopupDate(iso);
                    setCalCursor(parseISODate(iso));
                  }}
                />
              </div>
            </section>
          </main>
        </div>
      )}

      {/* Day popup from calendar */}
      {popupDate ? (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-3 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
            aria-label="Close"
            onClick={() => setPopupDate(null)}
          />
          <div className="relative z-10 flex h-[min(92dvh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-xl sm:p-5">
            <button
              type="button"
              onClick={() => setPopupDate(null)}
              className="absolute right-3 top-3 z-10 rounded-full border border-line bg-paper p-2 text-muted hover:text-ink"
              aria-label="Close day"
            >
              <X className="h-4 w-4" />
            </button>
            <DayLogForm
              date={popupDate}
              draft={popupDraft}
              onChange={setPopupDraft}
              saving={saving}
              compact
              onSave={async () => {
                await saveDay(popupDate, popupDraft);
                setPopupDate(null);
              }}
            />
          </div>
        </div>
      ) : null}

      {showSettings && profile ? (
        <SettingsPanel
          profile={profile}
          goals={goals}
          onClose={() => setShowSettings(false)}
          onSave={saveSettings}
        />
      ) : null}
    </div>
  );
}
