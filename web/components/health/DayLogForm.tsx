import { Plus, Trash2 } from "lucide-react";
import {
  DayDraft,
  EXERCISE_SUGGESTIONS,
  MealDraft,
  MEAL_SECTIONS,
  MealType,
  formatDayHeading,
  overallEnergyFromDraft,
} from "@/lib/health";

const inputClass =
  "w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink placeholder:text-muted focus:border-mint/50 focus:outline-none";

function MealBlock({
  title,
  meal,
  showEnergy,
  onChange,
}: {
  title: string;
  meal: MealDraft;
  showEnergy: boolean;
  onChange: (next: MealDraft) => void;
}) {
  function setItem(i: number, value: string) {
    const items = [...meal.items];
    items[i] = value;
    onChange({ ...meal, items });
  }

  function addItem() {
    onChange({ ...meal, items: [...meal.items, ""] });
  }

  function removeItem(i: number) {
    const items = meal.items.filter((_, idx) => idx !== i);
    onChange({ ...meal, items: items.length ? items : [""] });
  }

  return (
    <div className="rounded-xl border border-line bg-paper/40 p-3">
      <div className="mb-2 flex min-h-[30px] items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-wide">{title}</h3>
        {showEnergy ? (
          <label className="flex items-center gap-1.5 text-xs text-muted">
            Energy
            <select
              value={meal.energy}
              onChange={(e) => onChange({ ...meal, energy: e.target.value })}
              className="rounded-lg border border-line bg-surface px-2 py-1 text-sm text-ink"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span
            className="invisible flex items-center gap-1.5 text-xs"
            aria-hidden
          >
            Energy
            <span className="rounded-lg border px-2 py-1 text-sm">3</span>
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {meal.items.map((item, i) => (
          <div key={i} className="flex gap-1.5">
            <input
              value={item}
              onChange={(e) => setItem(i, e.target.value)}
              className={inputClass}
              placeholder={i === 0 ? "Pizza Slice" : "Food item"}
            />
            {meal.items.length > 1 ? (
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="shrink-0 rounded-lg border border-line px-2 text-muted hover:text-ink"
                aria-label="Remove item"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
        >
          <Plus className="h-3 w-3" /> Add food item
        </button>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {(
          [
            ["calories", "Cal"],
            ["protein", "P (g)"],
            ["carbs", "C (g)"],
            ["fat", "F (g)"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="mb-0.5 block text-[10px] uppercase tracking-wider text-muted">
              {label}
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={meal[key]}
              onChange={(e) => onChange({ ...meal, [key]: e.target.value })}
              className={inputClass}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DayLogForm({
  date,
  draft,
  onChange,
  onSave,
  saving,
  compact,
}: {
  date: string;
  draft: DayDraft;
  onChange: (next: DayDraft) => void;
  onSave: () => void;
  saving?: boolean;
  compact?: boolean;
}) {
  const overallEnergy = overallEnergyFromDraft(draft);

  function setMeal(type: MealType, next: MealDraft) {
    onChange({ ...draft, [type]: next });
  }

  function setExercise(i: number, patch: Partial<DayDraft["exercises"][0]>) {
    const exercises = draft.exercises.map((ex, idx) =>
      idx === i ? { ...ex, ...patch } : ex
    );
    onChange({ ...draft, exercises });
  }

  function addExercise() {
    onChange({
      ...draft,
      exercises: [...draft.exercises, { activity_type: "", duration_minutes: "" }],
    });
  }

  function removeExercise(i: number) {
    const exercises = draft.exercises.filter((_, idx) => idx !== i);
    onChange({
      ...draft,
      exercises: exercises.length
        ? exercises
        : [{ activity_type: "", duration_minutes: "" }],
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex shrink-0 items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{formatDayHeading(date)}</h2>
          <p className="text-xs text-muted">
            Food items, macros, energy, sleep, exercise, and weight.
          </p>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-full bg-mint px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save day"}
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {MEAL_SECTIONS.map(({ key, label }) => (
            <MealBlock
              key={key}
              title={label}
              meal={draft[key]}
              showEnergy
              onChange={(next) => setMeal(key, next)}
            />
          ))}
          <MealBlock
            title="Snacks"
            meal={draft.snack}
            showEnergy={false}
            onChange={(next) => setMeal("snack", next)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-paper/40 p-3">
            <label className="mb-1.5 block text-sm font-semibold">Overall mood</label>
            <select
              value={draft.mood}
              onChange={(e) => onChange({ ...draft, mood: e.target.value })}
              className={inputClass}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} / 5
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-xl border border-line bg-paper/40 p-3">
            <label className="mb-1.5 block text-sm font-semibold">Overall energy</label>
            <div className="flex h-[34px] items-center rounded-lg border border-line bg-surface px-3 text-sm tabular-nums text-ink">
              {overallEnergy != null ? `${overallEnergy} / 5` : "—"}
              <span className="ml-2 text-xs text-muted">avg of meals</span>
            </div>
          </div>
          <div className="rounded-xl border border-line bg-paper/40 p-3">
            <label className="mb-1.5 block text-sm font-semibold">Weight</label>
            <input
              type="number"
              step="0.1"
              value={draft.weight}
              onChange={(e) => onChange({ ...draft, weight: e.target.value })}
              className={inputClass}
              placeholder="Today’s weight"
            />
          </div>
        </div>

        <div className="rounded-xl border border-line bg-paper/40 p-3">
          <label className="mb-1.5 block text-sm font-semibold">Sleep (hours)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="24"
            value={draft.sleep_hours}
            onChange={(e) => onChange({ ...draft, sleep_hours: e.target.value })}
            className={`${inputClass} max-w-[12rem]`}
            placeholder="7.5"
          />
        </div>

        <div className="rounded-xl border border-line bg-paper/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Exercise</h3>
            <button
              type="button"
              onClick={addExercise}
              className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs text-muted hover:text-ink"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {draft.exercises.map((ex, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
                <input
                  list="exercise-suggestions"
                  value={ex.activity_type}
                  onChange={(e) => setExercise(i, { activity_type: e.target.value })}
                  className={inputClass}
                  placeholder="Walk, run, back day…"
                />
                <input
                  value={ex.duration_minutes}
                  onChange={(e) =>
                    setExercise(i, { duration_minutes: e.target.value })
                  }
                  className={inputClass}
                  placeholder="60 or 1h 30m"
                />
                <button
                  type="button"
                  onClick={() => removeExercise(i)}
                  className="rounded-lg border border-line px-2 text-muted hover:text-ink"
                  aria-label="Remove exercise"
                >
                  <Trash2 className="mx-auto h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <datalist id="exercise-suggestions">
            {EXERCISE_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </div>
    </div>
  );
}
