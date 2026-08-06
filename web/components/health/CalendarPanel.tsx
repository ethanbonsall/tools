import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  CalView,
  CalendarCell,
  DailyLog,
  WEEKDAYS,
  formatMonthLabel,
  formatWeekLabel,
  logOverallEnergy,
  logOverallMood,
  startOfWeek,
  todayISO,
} from "@/lib/health";

export default function CalendarPanel({
  calView,
  calCursor,
  cells,
  logsByDate,
  onViewChange,
  onShift,
  onSelectDay,
}: {
  calView: CalView;
  calCursor: Date;
  cells: CalendarCell[];
  logsByDate: Map<string, DailyLog>;
  onViewChange: (v: CalView) => void;
  onShift: (dir: -1 | 1) => void;
  onSelectDay: (iso: string) => void;
}) {
  const label =
    calView === "month"
      ? formatMonthLabel(calCursor)
      : formatWeekLabel(startOfWeek(calCursor));

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Calendar</h2>
          <p className="text-sm text-muted">Click a day to open its log.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-line p-0.5 text-sm">
            {(["week", "month"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onViewChange(v)}
                className={`rounded-full px-3 py-1.5 capitalize ${
                  calView === v ? "bg-ink text-paper" : "text-muted hover:text-ink"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onShift(-1)}
              className="rounded-full border border-line p-2 text-muted hover:text-ink"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[10rem] text-center text-sm font-medium">{label}</span>
            <button
              type="button"
              onClick={() => onShift(1)}
              className="rounded-full border border-line p-2 text-muted hover:text-ink"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-paper/30">
        <div className="grid shrink-0 grid-cols-7 border-b border-line">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted"
            >
              {d}
            </div>
          ))}
        </div>
        <div
          className={`grid min-h-0 flex-1 grid-cols-7 ${
            calView === "month" ? "grid-rows-6" : "grid-rows-1"
          }`}
        >
          {cells.map((cell) => {
            const log = logsByDate.get(cell.iso);
            const selectedToday = cell.iso === todayISO();
            const energy = log ? logOverallEnergy(log) : null;
            const mood = log ? logOverallMood(log) : null;
            const weight = log?.weight;

            return (
              <button
                key={cell.iso}
                type="button"
                onClick={() => onSelectDay(cell.iso)}
                className={`flex flex-col border-b border-r border-line p-2 text-left transition hover:bg-mint-soft/50 ${
                  !cell.inMonth && calView === "month" ? "opacity-35" : ""
                }`}
              >
                <span
                  className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium tabular-nums ${
                    selectedToday ? "bg-mint text-paper" : "text-muted"
                  }`}
                >
                  {cell.day}
                </span>
                {log ? (
                  <div className="mt-auto space-y-0.5 text-[11px] leading-snug text-muted">
                    <div>
                      M {mood ?? "—"} · E {energy ?? "—"}
                    </div>
                    {weight != null ? (
                      <div className="tabular-nums">{weight}</div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-auto text-[11px] text-muted/50">—</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
