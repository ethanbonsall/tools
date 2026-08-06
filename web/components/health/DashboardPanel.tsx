import { Settings } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DailyLog,
  HealthProfile,
  WeightGoal,
  logOverallEnergy,
  logOverallMood,
} from "@/lib/health";

function TrendChart({
  title,
  data,
  dataKey,
  color,
  domain,
}: {
  title: string;
  data: { date: string; value: number | null }[];
  dataKey: string;
  color: string;
  domain?: [number, number];
}) {
  const points = data.filter((d) => d.value != null);
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-line bg-paper/40 p-3">
      <h3 className="mb-2 shrink-0 text-sm font-semibold">{title}</h3>
      {points.length < 2 ? (
        <div className="flex flex-1 items-center justify-center text-xs text-muted">
          Log a few days to see a trend
        </div>
      ) : (
        <div className="min-h-0 flex-1" style={{ minHeight: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--line))" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(var(--muted))", fontSize: 10 }}
                tickFormatter={(v: string) => v.slice(5)}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={domain ?? ["auto", "auto"]}
                tick={{ fill: "hsl(var(--muted))", fontSize: 10 }}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--surface))",
                  border: "1px solid hsl(var(--line))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function DashboardPanel({
  profile,
  goals,
  logs,
  onOpenSettings,
}: {
  profile: HealthProfile;
  goals: WeightGoal[];
  logs: DailyLog[];
  onOpenSettings: () => void;
}) {
  const sorted = [...logs].sort((a, b) => a.log_date.localeCompare(b.log_date));
  const latestWeight =
    [...sorted].reverse().find((l) => l.weight != null)?.weight ??
    profile.current_weight;
  const firstWeight = sorted.find((l) => l.weight != null)?.weight ?? null;
  const openGoals = goals
    .filter((g) => !g.hit)
    .sort((a, b) => a.target_date.localeCompare(b.target_date));
  const nextGoal = openGoals[0];

  const changeFromStart =
    latestWeight != null && firstWeight != null
      ? Number(latestWeight) - Number(firstWeight)
      : null;
  const toTarget =
    latestWeight != null && nextGoal
      ? Number(latestWeight) - Number(nextGoal.target_weight)
      : null;

  const energySeries = sorted.map((l) => ({
    date: l.log_date,
    value: logOverallEnergy(l),
  }));
  const moodSeries = sorted.map((l) => ({
    date: l.log_date,
    value: logOverallMood(l),
  }));
  const weightSeries = sorted.map((l) => ({
    date: l.log_date,
    value: l.weight != null ? Number(l.weight) : null,
  }));

  const goalLabel =
    profile.goal_type === "lose_weight"
      ? "Lose weight"
      : profile.goal_type === "gain_weight"
        ? "Gain weight"
        : "Track health";

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
          <p className="mt-0.5 text-sm text-muted">{goalLabel}</p>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-muted transition hover:border-mint/40 hover:text-ink"
          aria-label="Goals and macros"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-line bg-paper/40 p-4">
          <div className="text-xs uppercase tracking-wider text-muted">Weight</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
            {latestWeight != null ? latestWeight : "—"}
          </div>
          {changeFromStart != null && changeFromStart !== 0 ? (
            <p className="mt-1 text-xs text-muted">
              {changeFromStart > 0 ? "+" : ""}
              {changeFromStart.toFixed(1)} since first log
            </p>
          ) : null}
          {toTarget != null ? (
            <p className="mt-0.5 text-xs text-muted">
              {toTarget === 0
                ? "At target"
                : toTarget > 0
                  ? `${toTarget.toFixed(1)} above target`
                  : `${Math.abs(toTarget).toFixed(1)} to go`}
            </p>
          ) : null}
        </div>
        <div className="rounded-xl border border-line bg-paper/40 p-4">
          <div className="text-xs uppercase tracking-wider text-muted">
            Next target
            {openGoals.length > 1 ? ` · ${openGoals.length} open` : ""}
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
            {nextGoal ? nextGoal.target_weight : "—"}
          </div>
          {nextGoal ? (
            <p className="mt-1 text-xs text-muted">by {nextGoal.target_date}</p>
          ) : (
            <p className="mt-1 text-xs text-muted">No goal set</p>
          )}
          {openGoals.length > 1 ? (
            <ul className="mt-2 space-y-0.5 text-xs text-muted">
              {openGoals.slice(1, 4).map((g) => (
                <li key={g.id} className="tabular-nums">
                  {g.target_weight} by {g.target_date}
                </li>
              ))}
              {openGoals.length > 4 ? (
                <li>+{openGoals.length - 4} more</li>
              ) : null}
            </ul>
          ) : null}
        </div>
        <div className="rounded-xl border border-line bg-paper/40 p-4">
          <div className="text-xs uppercase tracking-wider text-muted">Calories</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
            {profile.calories_goal ?? "—"}
          </div>
          <p className="mt-1 text-xs text-muted">daily target</p>
        </div>
        <div className="rounded-xl border border-line bg-paper/40 p-4">
          <div className="text-xs uppercase tracking-wider text-muted">Macros</div>
          <div className="mt-1 text-lg font-semibold tabular-nums tracking-tight">
            P {profile.protein_goal ?? "—"} · C {profile.carbs_goal ?? "—"} · F{" "}
            {profile.fat_goal ?? "—"}
          </div>
          <p className="mt-1 text-xs text-muted">grams / day</p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-3">
        <TrendChart
          title="Energy"
          data={energySeries}
          dataKey="value"
          color="hsl(var(--mint))"
          domain={[1, 5]}
        />
        <TrendChart
          title="Mood"
          data={moodSeries}
          dataKey="value"
          color="hsl(var(--ink))"
          domain={[1, 5]}
        />
        <TrendChart
          title="Weight"
          data={weightSeries}
          dataKey="value"
          color="hsl(var(--mint))"
        />
      </div>
    </div>
  );
}
