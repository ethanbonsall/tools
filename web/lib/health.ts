/** Calories per gram for each macro. */
export const CAL_PER_G = {
  protein: 4,
  carbs: 4,
  fat: 9,
} as const;

export type GoalType = "lose_weight" | "maintain" | "gain_weight";
export type CalView = "week" | "month";
export type HealthTab = "dashboard" | "log" | "calendar";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type MacroPercents = {
  protein: number;
  carbs: number;
  fat: number;
};

export type MacroGrams = {
  protein: number;
  carbs: number;
  fat: number;
};

export type HealthProfile = {
  user_id: string;
  goal_type: GoalType;
  current_weight: number | null;
  protein_goal: number | null;
  carbs_goal: number | null;
  fat_goal: number | null;
  calories_goal: number | null;
  onboarded_at: string | null;
  last_checkin_prompt_date: string | null;
};

export type DailyLog = {
  id: number;
  log_date: string;
  energy_morning: number | null;
  energy_midday: number | null;
  energy_night: number | null;
  mood_morning: number | null;
  mood_midday: number | null;
  mood_night: number | null;
  mood_overall: number | null;
  sleep_hours: number | null;
  weight: number | null;
  activity: string | null;
};

export type Meal = {
  id: number;
  daily_log_id: number;
  meal_type: MealType;
  description: string | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  calories: number | null;
  energy: number | null;
};

export type MealItem = {
  id: number;
  meal_id: number;
  description: string;
  sort_order: number;
};

export type Exercise = {
  id: number;
  daily_log_id: number;
  activity_type: string;
  duration_minutes: number | null;
  sort_order: number;
};

export type WeightGoal = {
  id: number;
  target_weight: number;
  target_date: string;
  reward: string | null;
  hit: boolean;
};

export type HealthEvent = {
  id: number;
  title: string;
  event_date: string;
  notes: string | null;
  is_deadline: boolean;
};

export type MealDraft = {
  items: string[];
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  energy: string;
};

export type ExerciseDraft = {
  activity_type: string;
  duration_minutes: string;
};

export type DayDraft = {
  breakfast: MealDraft;
  lunch: MealDraft;
  dinner: MealDraft;
  snack: MealDraft;
  mood: string;
  sleep_hours: string;
  weight: string;
  exercises: ExerciseDraft[];
};

export const MEAL_SECTIONS: {
  key: Exclude<MealType, "snack">;
  label: string;
  energyKey: "energy_morning" | "energy_midday" | "energy_night";
}[] = [
  { key: "breakfast", label: "Morning", energyKey: "energy_morning" },
  { key: "lunch", label: "Midday", energyKey: "energy_midday" },
  { key: "dinner", label: "Night", energyKey: "energy_night" },
];

export function emptyMealDraft(withEnergy = true): MealDraft {
  return {
    items: [""],
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    energy: withEnergy ? "3" : "",
  };
}

export function emptyDayDraft(): DayDraft {
  return {
    breakfast: emptyMealDraft(true),
    lunch: emptyMealDraft(true),
    dinner: emptyMealDraft(true),
    snack: emptyMealDraft(false),
    mood: "3",
    sleep_hours: "",
    weight: "",
    exercises: [{ activity_type: "", duration_minutes: "" }],
  };
}

/** Grams from calorie budget × percent of calories. */
export function gramsFromPercent(
  calories: number,
  percent: number,
  calPerGram: number
): number {
  if (!calories || !percent || !calPerGram) return 0;
  return Math.round(((calories * (percent / 100)) / calPerGram) * 10) / 10;
}

export function macrosFromCaloriesAndPercents(
  calories: number,
  percents: MacroPercents
): MacroGrams {
  return {
    protein: gramsFromPercent(calories, percents.protein, CAL_PER_G.protein),
    carbs: gramsFromPercent(calories, percents.carbs, CAL_PER_G.carbs),
    fat: gramsFromPercent(calories, percents.fat, CAL_PER_G.fat),
  };
}

export function macroPercentTotal(percents: MacroPercents): number {
  return (
    (Number(percents.protein) || 0) +
    (Number(percents.carbs) || 0) +
    (Number(percents.fat) || 0)
  );
}

/** Reverse grams → % of calorie budget (rounded). */
export function percentsFromGrams(
  calories: number | null | undefined,
  grams: Partial<MacroGrams>
): MacroPercents {
  const cal = Number(calories) || 0;
  if (!cal) return { protein: 30, carbs: 40, fat: 30 };
  const pct = (g: number | null | undefined, per: number) =>
    Math.round((((Number(g) || 0) * per) / cal) * 100);
  return {
    protein: pct(grams.protein, CAL_PER_G.protein),
    carbs: pct(grams.carbs, CAL_PER_G.carbs),
    fat: pct(grams.fat, CAL_PER_G.fat),
  };
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(y, m - 1, day);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

/** Sunday-start week containing `d`. */
export function startOfWeek(d: Date): Date {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function formatWeekLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${weekStart.toLocaleDateString(undefined, { month: "long" })} ${weekStart.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

export function formatDayHeading(iso: string): string {
  const d = parseISODate(iso);
  const today = todayISO();
  const label = d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  if (iso === today) return `Today · ${label}`;
  return label;
}

export type CalendarCell = {
  iso: string;
  day: number;
  inMonth: boolean;
};

/** 6×7 grid for a month view (Sunday start). */
export function monthGrid(anchor: Date): CalendarCell[] {
  const first = startOfMonth(anchor);
  const gridStart = startOfWeek(first);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    cells.push({
      iso: toISODate(d),
      day: d.getDate(),
      inMonth: d.getMonth() === anchor.getMonth(),
    });
  }
  return cells;
}

export function weekGrid(anchor: Date): CalendarCell[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    return { iso: toISODate(d), day: d.getDate(), inMonth: true };
  });
}

export function avgScore(
  ...values: (number | null | undefined)[]
): number | null {
  const nums = values.filter((v): v is number => typeof v === "number");
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

/** Average of meal energies, nearest 0.1. */
export function overallEnergyFromDraft(draft: DayDraft): number | null {
  const vals = [draft.breakfast.energy, draft.lunch.energy, draft.dinner.energy]
    .map((v) => Number(v))
    .filter((n) => !Number.isNaN(n) && n > 0);
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export function logOverallEnergy(log: DailyLog): number | null {
  return avgScore(log.energy_morning, log.energy_midday, log.energy_night);
}

export function logOverallMood(log: DailyLog): number | null {
  if (log.mood_overall != null) return Number(log.mood_overall);
  return avgScore(log.mood_morning, log.mood_midday, log.mood_night);
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || Number.isNaN(Number(minutes))) return "—";
  const m = Number(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = Math.round(m % 60);
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

/** Whether current weight has reached a goal target. */
export function isWeightGoalHit(
  goalType: GoalType,
  weight: number,
  target: number
): boolean {
  if (goalType === "lose_weight") return weight <= target;
  if (goalType === "gain_weight") return weight >= target;
  return Math.abs(weight - target) <= 0.5;
}

export function parseDurationInput(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  const asNum = Number(s);
  if (!Number.isNaN(asNum)) return asNum;
  const hourMatch = s.match(/(\d+(?:\.\d+)?)\s*h/);
  const minMatch = s.match(/(\d+(?:\.\d+)?)\s*m/);
  let total = 0;
  if (hourMatch) total += Number(hourMatch[1]) * 60;
  if (minMatch) total += Number(minMatch[1]);
  if (total > 0) return total;
  return null;
}

export function buildDayDraft(
  log: DailyLog | undefined,
  meals: Meal[],
  items: MealItem[],
  exercises: Exercise[]
): DayDraft {
  const draft = emptyDayDraft();
  if (!log) return draft;

  draft.mood = String(
    log.mood_overall ??
      avgScore(log.mood_morning, log.mood_midday, log.mood_night) ??
      3
  );
  draft.sleep_hours = log.sleep_hours != null ? String(log.sleep_hours) : "";
  draft.weight = log.weight != null ? String(log.weight) : "";

  const itemsByMeal = new Map<number, MealItem[]>();
  for (const item of items) {
    const list = itemsByMeal.get(item.meal_id) ?? [];
    list.push(item);
    itemsByMeal.set(item.meal_id, list);
  }

  const energyFallback = {
    breakfast: log.energy_morning,
    lunch: log.energy_midday,
    dinner: log.energy_night,
  } as const;

  for (const type of ["breakfast", "lunch", "dinner", "snack"] as const) {
    const meal = meals.find((m) => m.meal_type === type);
    const section = draft[type];
    if (!meal) {
      if (type !== "snack") {
        const e = energyFallback[type];
        section.energy = e != null ? String(e) : "3";
      }
      continue;
    }
    const mealItems = (itemsByMeal.get(meal.id) ?? []).sort(
      (a, b) => a.sort_order - b.sort_order
    );
    section.items =
      mealItems.length > 0
        ? mealItems.map((i) => i.description)
        : meal.description
          ? [meal.description]
          : [""];
    section.calories = meal.calories != null ? String(meal.calories) : "";
    section.protein = meal.protein != null ? String(meal.protein) : "";
    section.carbs = meal.carbs != null ? String(meal.carbs) : "";
    section.fat = meal.fat != null ? String(meal.fat) : "";
    if (type !== "snack") {
      section.energy =
        meal.energy != null
          ? String(meal.energy)
          : energyFallback[type] != null
            ? String(energyFallback[type])
            : "3";
    }
  }

  const sorted = [...exercises].sort((a, b) => a.sort_order - b.sort_order);
  draft.exercises =
    sorted.length > 0
      ? sorted.map((ex) => ({
          activity_type: ex.activity_type,
          duration_minutes:
            ex.duration_minutes != null ? String(ex.duration_minutes) : "",
        }))
      : [{ activity_type: "", duration_minutes: "" }];

  return draft;
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const EXERCISE_SUGGESTIONS = [
  "Walk",
  "Run",
  "Weight lifting",
  "Back day",
  "Push day",
  "Pull day",
  "Legs",
  "Yoga",
  "Bike",
  "Swim",
];
