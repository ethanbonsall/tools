import { FormEvent, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  GoalType,
  HealthProfile,
  WeightGoal,
  macroPercentTotal,
  macrosFromCaloriesAndPercents,
  percentsFromGrams,
} from "@/lib/health";

const inputClass =
  "w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-mint/50 focus:outline-none";

export type GoalDraft = {
  key: string;
  existingId?: number;
  target_weight: string;
  target_date: string;
  reward: string;
  remove?: boolean;
};

function emptyGoalDraft(): GoalDraft {
  return {
    key: `new-${crypto.randomUUID()}`,
    target_weight: "",
    target_date: "",
    reward: "",
  };
}

export default function SettingsPanel({
  profile,
  goals,
  onClose,
  onSave,
}: {
  profile: HealthProfile;
  goals: WeightGoal[];
  onClose: () => void;
  onSave: (payload: {
    profile: Partial<HealthProfile>;
    goals: GoalDraft[];
  }) => Promise<void>;
}) {
  const initialPct = percentsFromGrams(profile.calories_goal, {
    protein: profile.protein_goal ?? undefined,
    carbs: profile.carbs_goal ?? undefined,
    fat: profile.fat_goal ?? undefined,
  });

  const [goalType, setGoalType] = useState<GoalType>(profile.goal_type);
  const [currentWeight, setCurrentWeight] = useState(
    profile.current_weight != null ? String(profile.current_weight) : ""
  );
  const [calories, setCalories] = useState(
    profile.calories_goal != null ? String(profile.calories_goal) : ""
  );
  const [proteinPct, setProteinPct] = useState(String(initialPct.protein));
  const [carbsPct, setCarbsPct] = useState(String(initialPct.carbs));
  const [fatPct, setFatPct] = useState(String(initialPct.fat));
  const [goalDrafts, setGoalDrafts] = useState<GoalDraft[]>(() => {
    const sorted = [...goals].sort((a, b) =>
      a.target_date.localeCompare(b.target_date)
    );
    if (sorted.length === 0) return [emptyGoalDraft()];
    return sorted.map((g) => ({
      key: `id-${g.id}`,
      existingId: g.id,
      target_weight: String(g.target_weight),
      target_date: g.target_date,
      reward: g.reward ?? "",
    }));
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cal = Number(calories) || 0;
  const percents = useMemo(
    () => ({
      protein: Number(proteinPct) || 0,
      carbs: Number(carbsPct) || 0,
      fat: Number(fatPct) || 0,
    }),
    [proteinPct, carbsPct, fatPct]
  );
  const grams = macrosFromCaloriesAndPercents(cal, percents);
  const total = macroPercentTotal(percents);

  const visibleGoals = goalDrafts.filter((g) => !g.remove);

  function updateGoal(key: string, patch: Partial<GoalDraft>) {
    setGoalDrafts((prev) =>
      prev.map((g) => (g.key === key ? { ...g, ...patch } : g))
    );
  }

  function addGoal() {
    setGoalDrafts((prev) => [...prev, emptyGoalDraft()]);
  }

  function removeGoal(key: string) {
    setGoalDrafts((prev) => {
      const target = prev.find((g) => g.key === key);
      if (!target) return prev;
      if (target.existingId) {
        return prev.map((g) => (g.key === key ? { ...g, remove: true } : g));
      }
      const next = prev.filter((g) => g.key !== key);
      return next.length ? next : [emptyGoalDraft()];
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (total !== 100) {
      setErr("Macro percents must total 100%.");
      return;
    }
    if (!cal) {
      setErr("Enter a calorie target.");
      return;
    }

    const incomplete = visibleGoals.find(
      (g) =>
        (g.target_weight && !g.target_date) ||
        (!g.target_weight && g.target_date)
    );
    if (incomplete) {
      setErr("Each weight goal needs both a target weight and a date.");
      return;
    }

    setSaving(true);
    setErr(null);
    try {
      await onSave({
        profile: {
          goal_type: goalType,
          current_weight: Number(currentWeight) || null,
          calories_goal: cal,
          protein_goal: grams.protein,
          carbs_goal: grams.carbs,
          fat_goal: grams.fat,
        },
        goals: goalDrafts,
      });
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <form
        onSubmit={submit}
        className="relative z-10 flex max-h-[min(92vh,760px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-xl sm:p-6"
      >
        {err ? (
          <div className="mb-3 shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {err}
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* Left: profile + macros */}
          <div className="space-y-4 overflow-y-auto pr-1">
            <div>
              <label className="mb-1 block text-sm font-medium">Direction</label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value as GoalType)}
                className={inputClass}
              >
                <option value="lose_weight">Lose weight</option>
                <option value="maintain">Keep track of health</option>
                <option value="gain_weight">Gain weight</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Current weight</label>
              <input
                type="number"
                step="0.1"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Daily calories</label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium">Macros %</span>
                <span className={total === 100 ? "text-mint" : "text-amber-700"}>
                  {total}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["Protein", proteinPct, setProteinPct, grams.protein],
                    ["Carbs", carbsPct, setCarbsPct, grams.carbs],
                    ["Fat", fatPct, setFatPct, grams.fat],
                  ] as const
                ).map(([label, val, set, g]) => (
                  <div key={label}>
                    <label className="mb-1 block text-xs text-muted">{label}</label>
                    <input
                      type="number"
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      className={inputClass}
                    />
                    <p className="mt-1 text-[11px] text-muted">{g}g</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: goals — match left label/spacing */}
          <div className="min-h-0 space-y-4 overflow-y-auto">
            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <div className="w-[4.25rem] shrink-0 text-sm font-medium">
                    Weight
                  </div>
                  <div className="w-[8.5rem] shrink-0 text-sm font-medium">Date</div>
                  <div className="min-w-0 flex-1 text-sm font-medium">Reward</div>
                  <div className="w-7 shrink-0" aria-hidden />
                </div>
                <button
                  type="button"
                  onClick={addGoal}
                  className="shrink-0 text-sm font-medium text-ink transition hover:text-ink/80"
                >
                  + Add goal
                </button>
              </div>
              <div className="space-y-4">
                {visibleGoals.map((g) => (
                  <div key={g.key} className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={g.target_weight}
                      onChange={(e) =>
                        updateGoal(g.key, { target_weight: e.target.value })
                      }
                      className={`${inputClass} w-[4.25rem] shrink-0`}
                      placeholder="180"
                      aria-label="Target weight"
                    />
                    <input
                      type="date"
                      value={g.target_date}
                      onChange={(e) =>
                        updateGoal(g.key, { target_date: e.target.value })
                      }
                      className={`${inputClass} w-[8.5rem] shrink-0`}
                      aria-label="Target date"
                    />
                    <input
                      value={g.reward}
                      onChange={(e) =>
                        updateGoal(g.key, { reward: e.target.value })
                      }
                      className={`${inputClass} min-w-0 flex-1`}
                      placeholder="Optional"
                      aria-label="Reward"
                    />
                    <button
                      type="button"
                      onClick={() => removeGoal(g.key)}
                      className="flex h-[42px] w-7 shrink-0 items-center justify-center text-muted/70 transition hover:text-ink"
                      aria-label="Remove goal"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex shrink-0 justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-mint px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
