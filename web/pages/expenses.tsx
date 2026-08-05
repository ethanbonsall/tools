"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { supabase } from "@/lib/supabaseClient";
import NavBar from "@/components/navabar_2";
import PageColorPicker from "@/components/PageColorPicker";

const BALANCE_CATEGORY = "_balance";
const WEEKLY_BUDGET_CATEGORY = "Weekly Budget";
const WEEKLY_BUDGET_CATEGORY_LEGACY = "_weekly_budget";
const WEEKLY_PURCHASE_CATEGORY = "_weekly_purchase";
const WEEKLY_CHARGE_CATEGORY = "_weekly_charge";
const RECURRENCE_EXCEPTION_CATEGORY = "_recurrence_exception";
const HIDDEN_CATEGORY = "_hidden";
const OVERAGE_CATEGORY = "_overage";

const CHARGE_DAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

type ExpenseRow = {
  id: number;
  created_at: string;
  name: string | null;
  amount: number | null;
  recurring_time: number | null;
  recuring_length: string | null;
  category: string | null;
  income: boolean | null;
  date: string | null;
  end_date: string | null;
  user_id: string | null;
};

const RECUR_UNITS = ["days", "weeks", "months"] as const;
type RecurUnit = (typeof RECUR_UNITS)[number];

function parseRecurring(recuring_length: string | null, recurring_time: number | null): { times: number; every: number; unit: string } | null {
  if (!recuring_length || recurring_time == null) return null;
  const parts = recuring_length.split("_");
  if (parts.length >= 2) {
    const times = parseInt(parts[0], 10);
    const unit = parts.slice(1).join("_");
    return Number.isNaN(times) ? null : { times, every: recurring_time, unit };
  }
  return { times: 1, every: recurring_time, unit: recuring_length };
}

function displayCategory(row: ExpenseRow): string {
  if (
    row.category === WEEKLY_BUDGET_CATEGORY ||
    row.category === WEEKLY_BUDGET_CATEGORY_LEGACY
  )
    return "Weekly Budget";
  if (row.category === HIDDEN_CATEGORY) return "(past)";
  return row.category ?? "—";
}

function formatRecurring(row: ExpenseRow): string {
  if (
    (row.category === WEEKLY_BUDGET_CATEGORY ||
      row.category === WEEKLY_BUDGET_CATEGORY_LEGACY) &&
    row.recuring_length === "week" &&
    row.recurring_time != null
  ) {
    const dayLabel = CHARGE_DAY_OPTIONS[row.recurring_time as number]?.label ?? "?";
    return `Every 1 week (charge ${dayLabel})`;
  }
  const p = parseRecurring(row.recuring_length, row.recurring_time);
  if (!p) return "—";
  const unitLabel = p.unit === "days" ? "day" : p.unit === "weeks" ? "week" : "month";
  const everyLabel = p.every === 1 ? unitLabel : `${p.every} ${unitLabel}s`;
  if (p.times === 1) return `Every ${everyLabel}`;
  return `${p.times} times every ${everyLabel}`;
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeekSunday(d: Date) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() - dt.getDay());
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function isDateInWeek(dateStr: string, weekStart: Date) {
  const d = new Date(dateStr + "T12:00:00");
  const wEnd = addDays(weekStart, 7);
  return d >= weekStart && d < wEnd;
}

/** Week starts on chargeDay (0=Sun, 1=Mon, ...). Returns the week-start date that contains d. */
function getWeekStartByChargeDay(d: Date, chargeDay: number) {
  const dt = new Date(d);
  const dayOfWeek = dt.getDay();
  const diff = (dayOfWeek - chargeDay + 7) % 7;
  dt.setDate(dt.getDate() - diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function weekStartToISODate(d: Date) {
  return toISODate(d);
}

function addMonths(d: Date, months: number) {
  const next = new Date(d);
  next.setMonth(next.getMonth() + months);
  return next;
}

/** One row in the scheduled events table: either a single event or one occurrence of a recurring event. */
type DisplayEventRow = {
  source: ExpenseRow;
  occurrenceDate: string;
  isExpanded: boolean;
  /** For recurring: base amount + sum of overages for this occurrence. */
  effectiveAmount?: number;
};

/** Exception: skip one occurrence of a recurring event. Stored as name "exception:eventId", date = occurrence date. */
type RecurrenceException = { eventId: number; date: string };

/** Map key "eventId:occurrenceDate" -> total overage amount. */
function buildOverageMap(overageRows: ExpenseRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of overageRows) {
    if (r.category !== OVERAGE_CATEGORY || !r.name?.startsWith("overage:")) continue;
    const parts = r.name.slice("overage:".length).split(":");
    if (parts.length >= 2) {
      const eventId = parts[0];
      const occurrenceDate = parts[1];
      const key = `${eventId}:${occurrenceDate}`;
      map.set(key, (map.get(key) ?? 0) + (r.amount ?? 0));
    }
  }
  return map;
}

/** Expand recurring events (and weekly budget) into one row per occurrence until end_date. */
function expandToDisplayRows(
  events: ExpenseRow[],
  weeklyBudgetRow: ExpenseRow | null,
  chargeDay: number,
  todayISO: string,
  recurrenceExceptions: RecurrenceException[] = [],
  showPastEvents = false,
  overageMap: Map<string, number> = new Map()
): DisplayEventRow[] {
  const out: DisplayEventRow[] = [];
  const exceptionSet = new Set(
    recurrenceExceptions.map((ex) => `${ex.eventId}:${ex.date}`)
  );
  const includeDate = (iso: string) => showPastEvents || iso >= todayISO;

  if (weeklyBudgetRow?.end_date && weeklyBudgetRow.recurring_time != null) {
    const startDate = weeklyBudgetRow.date
      ? new Date(weeklyBudgetRow.date + "T12:00:00")
      : new Date();
    const start = getWeekStartByChargeDay(startDate, chargeDay);
    const end = new Date(weeklyBudgetRow.end_date + "T12:00:00");
    let d = new Date(start);
    while (d <= end) {
      const iso = toISODate(d);
      if (includeDate(iso) && !exceptionSet.has(`${weeklyBudgetRow.id}:${iso}`))
        out.push({
          source: weeklyBudgetRow,
          occurrenceDate: iso,
          isExpanded: true,
        });
      d = addDays(d, 7);
    }
  }

  for (const e of events) {
    const endDate = e.end_date;
    const recur = parseRecurring(e.recuring_length, e.recurring_time);
    const isWeeklyBudget =
      e.category === WEEKLY_BUDGET_CATEGORY || e.category === WEEKLY_BUDGET_CATEGORY_LEGACY;
    const isHidden = e.category === HIDDEN_CATEGORY;

    if (isWeeklyBudget) continue;
    if (isHidden && !showPastEvents) continue;

    if (!e.date) continue;
    if (!showPastEvents && e.date < todayISO) continue;

    if (!endDate || !recur) {
      if (!exceptionSet.has(`${e.id}:${e.date}`))
        out.push({ source: e, occurrenceDate: e.date, isExpanded: false });
      continue;
    }

    const end = new Date(endDate + "T12:00:00");
    let d = new Date(e.date + "T12:00:00");
    const every = recur.every ?? 1;
    const unit = recur.unit ?? "weeks";

    while (d <= end) {
      const iso = toISODate(d);
      if (includeDate(iso) && !exceptionSet.has(`${e.id}:${iso}`)) {
        const overage = overageMap.get(`${e.id}:${iso}`) ?? 0;
        const baseAmount = e.amount ?? 0;
        out.push({
          source: e,
          occurrenceDate: iso,
          isExpanded: true,
          effectiveAmount: baseAmount + overage,
        });
      }
      if (unit === "days") d = addDays(d, every);
      else if (unit === "weeks") d = addDays(d, every * 7);
      else if (unit === "months") d = addMonths(d, every);
      else d = addDays(d, every * 7);
    }
  }

  return out.sort((a, b) => a.occurrenceDate.localeCompare(b.occurrenceDate));
}

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-[min(92vw,28rem)] flex-col rounded-2xl border border-primary/30 bg-secondary shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-primary/20 px-4 py-3">
          <div className="truncate font-semibold text-text">{title}</div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg border border-primary/40 px-2 py-1 text-sm text-text/80 hover:bg-primary/20 hover:text-text"
            type="button"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [balanceRow, setBalanceRow] = useState<ExpenseRow | null>(null);
  const [events, setEvents] = useState<ExpenseRow[]>([]);
  const [weeklyBudgetRow, setWeeklyBudgetRow] = useState<ExpenseRow | null>(null);
  const [weeklyPurchases, setWeeklyPurchases] = useState<ExpenseRow[]>([]);
  const [recurrenceExceptions, setRecurrenceExceptions] = useState<
    RecurrenceException[]
  >([]);
  const [overageRows, setOverageRows] = useState<ExpenseRow[]>([]);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [balanceInput, setBalanceInput] = useState("");
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [weeklyBudgetInput, setWeeklyBudgetInput] = useState("");
  const [weeklyBudgetChargeDay, setWeeklyBudgetChargeDay] = useState(0);
  const [weeklyBudgetStartDate, setWeeklyBudgetStartDate] = useState("");
  const [weeklyBudgetEndDate, setWeeklyBudgetEndDate] = useState("");
  const [showWeeklyBudgetModal, setShowWeeklyBudgetModal] = useState(false);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemAmount, setItemAmount] = useState("");
  const [itemDate, setItemDate] = useState(() => toISODate(new Date()));
  const [saving, setSaving] = useState(false);

  const [draftName, setDraftName] = useState("");
  const [draftAmount, setDraftAmount] = useState("");
  const [draftDate, setDraftDate] = useState(() => toISODate(new Date()));
  const [draftCategory, setDraftCategory] = useState("");
  const [draftIncome, setDraftIncome] = useState(false);
  const [draftRecurring, setDraftRecurring] = useState(false);
  const [draftTimes, setDraftTimes] = useState("1");
  const [draftEvery, setDraftEvery] = useState("1");
  const [draftRecurUnit, setDraftRecurUnit] = useState<RecurUnit>("weeks");
  const [draftEndDate, setDraftEndDate] = useState("");

  const [editingEventRow, setEditingEventRow] = useState<DisplayEventRow | null>(
    null
  );

  const [editingCell, setEditingCell] = useState<{
    id: number;
    field: "amount" | "date" | "end_date";
    value: string;
  } | null>(null);
  const [draftOverage, setDraftOverage] = useState("0");
  const [recurrenceSectionOpen, setRecurrenceSectionOpen] = useState(false);

  const currentBalance = useMemo(() => {
    if (balanceRow?.amount != null) return balanceRow.amount;
    return 0;
  }, [balanceRow]);

  const weeklyBudgetAmount = useMemo(() => {
    if (weeklyBudgetRow?.amount != null) return weeklyBudgetRow.amount;
    return 0;
  }, [weeklyBudgetRow]);

  const todayISO = useMemo(() => toISODate(new Date()), []);
  const weekStart = useMemo(() => startOfWeekSunday(new Date()), []);

  const chargeDay = useMemo(
    () => (weeklyBudgetRow?.recurring_time != null ? (weeklyBudgetRow.recurring_time as number) : 0),
    [weeklyBudgetRow]
  );

  const overageMap = useMemo(() => buildOverageMap(overageRows), [overageRows]);

  const eventsDisplayRows = useMemo(
    () =>
      expandToDisplayRows(
        events,
        weeklyBudgetRow,
        chargeDay,
        todayISO,
        recurrenceExceptions,
        showPastEvents,
        overageMap
      ),
    [events, weeklyBudgetRow, chargeDay, todayISO, recurrenceExceptions, showPastEvents, overageMap]
  );

  const balanceAfterEachRow = useMemo(() => {
    const out: number[] = [];
    let running = currentBalance;
    for (const row of eventsDisplayRows) {
      const amt = row.effectiveAmount ?? row.source.amount ?? 0;
      running += row.source.income ? amt : -amt;
      out.push(running);
    }
    return out;
  }, [eventsDisplayRows, currentBalance]);

  /** For each recurring event (source id), the date of the next occurrence (first in series). Only that row gets an editable date. */
  const nextOccurrenceDateBySourceId = useMemo(() => {
    const m = new Map<number, string>();
    for (const row of eventsDisplayRows) {
      if (!row.isExpanded) continue;
      const current = m.get(row.source.id);
      if (current === undefined || row.occurrenceDate < current)
        m.set(row.source.id, row.occurrenceDate);
    }
    return m;
  }, [eventsDisplayRows]);

  const currentWeekStart = useMemo(
    () => getWeekStartByChargeDay(new Date(), chargeDay),
    [chargeDay]
  );

  const spentThisWeek = useMemo(() => {
    return weeklyPurchases
      .filter((p) => p.date && isDateInWeek(p.date, currentWeekStart))
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);
  }, [weeklyPurchases, currentWeekStart]);

  const purchasesThisWeek = useMemo(
    () =>
      weeklyPurchases
        .filter((p) => p.date && isDateInWeek(p.date, currentWeekStart))
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")),
    [weeklyPurchases, currentWeekStart]
  );

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setErrMsg(null);
    const { data, error } = await supabase
      .from("expenses")
      .select(
        "id, created_at, name, amount, recurring_time, recuring_length, category, income, date, end_date, user_id"
      )
      .eq("user_id", userId)
      .order("date", { ascending: true });

    if (error) {
      setErrMsg(error.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as ExpenseRow[];
    let balance: ExpenseRow | null = rows.find((r) => r.category === BALANCE_CATEGORY) ?? null;
    const weeklyBudget =
      rows.find(
        (r) =>
          r.category === WEEKLY_BUDGET_CATEGORY ||
          r.category === WEEKLY_BUDGET_CATEGORY_LEGACY
      ) ?? null;
    const purchaseRows = rows.filter((r) => r.category === WEEKLY_PURCHASE_CATEGORY);
    const chargedWeekRows = rows.filter(
      (r) => r.category === WEEKLY_CHARGE_CATEGORY && r.date != null
    ) as (ExpenseRow & { date: string })[];
    const chargedWeekMap = new Map(
      chargedWeekRows.map((r) => [r.date, { id: r.id, amount: r.amount ?? 0 }])
    );
    const exceptionRows = rows.filter(
      (r) => r.category === RECURRENCE_EXCEPTION_CATEGORY && r.name?.startsWith("exception:")
    );
    const recurrenceExceptions: RecurrenceException[] = exceptionRows
      .map((r) => {
        const eventId = parseInt(r.name?.replace("exception:", "") ?? "", 10);
        return r.date && !Number.isNaN(eventId)
          ? { eventId, date: r.date }
          : null;
      })
      .filter((x): x is RecurrenceException => x != null);

    const overageRowsData = rows.filter((r) => r.category === OVERAGE_CATEGORY);
    const eventRows = rows.filter(
      (r) =>
        r.category !== BALANCE_CATEGORY &&
        r.category !== WEEKLY_BUDGET_CATEGORY &&
        r.category !== WEEKLY_BUDGET_CATEGORY_LEGACY &&
        r.category !== WEEKLY_PURCHASE_CATEGORY &&
        r.category !== WEEKLY_CHARGE_CATEGORY &&
        r.category !== RECURRENCE_EXCEPTION_CATEGORY &&
        r.category !== OVERAGE_CATEGORY
    );

    const exceptionSet = new Set(
      recurrenceExceptions.map((ex) => `${ex.eventId}:${ex.date}`)
    );
    let newBalanceAmount = balance?.amount ?? 0;
    const newExceptions: RecurrenceException[] = [];

    const oneTimeRows = eventRows.filter((e) => {
      const hasRecur = e.end_date && (e.recuring_length || e.recurring_time != null);
      const isWeekly =
        e.category === WEEKLY_BUDGET_CATEGORY ||
        e.category === WEEKLY_BUDGET_CATEGORY_LEGACY;
      return !hasRecur || isWeekly;
    });
    const recurringRows = eventRows.filter((e) => {
      const hasRecur = e.end_date && (e.recuring_length || e.recurring_time != null);
      const isWeekly =
        e.category === WEEKLY_BUDGET_CATEGORY ||
        e.category === WEEKLY_BUDGET_CATEGORY_LEGACY;
      return hasRecur && !isWeekly && e.date;
    });

    for (const e of oneTimeRows) {
      if (!e.date || e.date > todayISO) continue;
      const amt = e.amount ?? 0;
      newBalanceAmount += e.income ? amt : -amt;
      await supabase.from("expenses").update({ category: HIDDEN_CATEGORY }).eq("id", e.id);
      e.category = HIDDEN_CATEGORY;
    }

    for (const e of recurringRows) {
      const recur = parseRecurring(e.recuring_length, e.recurring_time);
      if (!recur) continue;
      const end = new Date((e.end_date ?? "") + "T12:00:00");
      let d = new Date((e.date ?? "") + "T12:00:00");
      const every = recur.every ?? 1;
      const unit = recur.unit ?? "weeks";
      while (d <= end) {
        const iso = toISODate(d);
        if (iso <= todayISO && !exceptionSet.has(`${e.id}:${iso}`)) {
          const amt = e.amount ?? 0;
          newBalanceAmount += e.income ? amt : -amt;
          if (userId) {
            await supabase.from("expenses").insert({
              user_id: userId,
              name: `exception:${e.id}`,
              amount: 0,
              date: iso,
              category: RECURRENCE_EXCEPTION_CATEGORY,
              income: false,
            });
            newExceptions.push({ eventId: e.id, date: iso });
            exceptionSet.add(`${e.id}:${iso}`);
          }
        }
        if (unit === "days") d = addDays(d, every);
        else if (unit === "weeks") d = addDays(d, every * 7);
        else if (unit === "months") d = addMonths(d, every);
        else d = addDays(d, every * 7);
      }
    }

    if (weeklyBudget?.end_date && weeklyBudget.recurring_time != null && userId) {
      const wbChargeDay = weeklyBudget.recurring_time as number;
      const wbStartDate = weeklyBudget.date
        ? new Date(weeklyBudget.date + "T12:00:00")
        : new Date();
      const wbStart = getWeekStartByChargeDay(wbStartDate, wbChargeDay);
      const wbEnd = new Date(weeklyBudget.end_date + "T12:00:00");
      let wbD = new Date(wbStart);
      while (wbD <= wbEnd) {
        const iso = toISODate(wbD);
        if (iso <= todayISO && !exceptionSet.has(`${weeklyBudget.id}:${iso}`)) {
          await supabase.from("expenses").insert({
            user_id: userId,
            name: `exception:${weeklyBudget.id}`,
            amount: 0,
            date: iso,
            category: RECURRENCE_EXCEPTION_CATEGORY,
            income: false,
          });
          newExceptions.push({ eventId: weeklyBudget.id, date: iso });
          exceptionSet.add(`${weeklyBudget.id}:${iso}`);
        }
        wbD = addDays(wbD, 7);
      }
    }

    if (newBalanceAmount !== (balance?.amount ?? 0)) {
      if (balance) {
        await supabase
          .from("expenses")
          .update({ amount: newBalanceAmount })
          .eq("id", balance.id);
      } else if (userId) {
        const { data: inserted } = await supabase
          .from("expenses")
          .insert({
            user_id: userId,
            name: "Current balance",
            amount: newBalanceAmount,
            category: BALANCE_CATEGORY,
            income: true,
            date: null,
            end_date: null,
          })
          .select()
          .single();
        if (inserted) balance = inserted as ExpenseRow;
      }
    }

    let balanceAmount = newBalanceAmount;
    let finalPurchaseRows = purchaseRows;

    const today = new Date();
    if (weeklyBudget && userId && weeklyBudget.recurring_time != null) {
      const chargeDay = weeklyBudget.recurring_time as number;
      const budgetLimit = weeklyBudget.amount ?? 0;
      const endDate = weeklyBudget.end_date ? new Date(weeklyBudget.end_date + "T12:00:00") : null;
      const budgetStartDate = weeklyBudget.date ? new Date(weeklyBudget.date + "T12:00:00") : null;
      const budgetFirstWeekStart = budgetStartDate
        ? getWeekStartByChargeDay(budgetStartDate, chargeDay)
        : null;
      const currentWeekStart = getWeekStartByChargeDay(today, chargeDay);
      const currentWeekStartISO = weekStartToISODate(currentWeekStart);
      const isWeekOnOrAfterStart =
        !budgetFirstWeekStart || currentWeekStart >= budgetFirstWeekStart;

      if (isWeekOnOrAfterStart && !chargedWeekMap.has(currentWeekStartISO)) {
        const prevWeekStart = addDays(currentWeekStart, -7);
        const prevWeekStartISO = weekStartToISODate(prevWeekStart);
        const prevWeekEndISO = toISODate(addDays(prevWeekStart, 6));
        const prevWeekPurchases = purchaseRows.filter(
          (p) =>
            p.date &&
            p.date >= prevWeekStartISO &&
            p.date <= prevWeekEndISO
        );
        for (const p of prevWeekPurchases) {
          if (p.id) await supabase.from("expenses").delete().eq("id", p.id);
        }
        finalPurchaseRows = purchaseRows.filter(
          (p) =>
            !p.date ||
            p.date < prevWeekStartISO ||
            p.date > prevWeekEndISO
        );

        balanceAmount -= budgetLimit;
        if (balance) {
          await supabase
            .from("expenses")
            .update({ amount: balanceAmount })
            .eq("id", balance.id);
        } else if (userId) {
          const { data: inserted } = await supabase
            .from("expenses")
            .insert({
              user_id: userId,
              name: "Current balance",
              amount: balanceAmount,
              category: BALANCE_CATEGORY,
              income: true,
              date: null,
              end_date: null,
            })
            .select()
            .single();
          if (inserted) balance = inserted as ExpenseRow;
        }
        await supabase.from("expenses").insert({
          user_id: userId,
          name: "Weekly budget allocation",
          amount: 0,
          category: WEEKLY_CHARGE_CATEGORY,
          income: false,
          date: currentWeekStartISO,
        });
        chargedWeekMap.set(currentWeekStartISO, { id: 0, amount: 0 });
      }

      let weekStart = addDays(currentWeekStart, -7);
      while (true) {
        const weekStartISO = weekStartToISODate(weekStart);
        const weekEnd = addDays(weekStart, 6);
        if (weekEnd >= today) break;
        if (endDate && weekEnd > endDate) break;
        if (budgetFirstWeekStart && weekStart < budgetFirstWeekStart) break;
        const existing = chargedWeekMap.get(weekStartISO);
        if (!existing) {
          balanceAmount -= budgetLimit;
          if (balance) {
            await supabase
              .from("expenses")
              .update({ amount: balanceAmount })
              .eq("id", balance.id);
          }
          const { data: allocRow } = await supabase
            .from("expenses")
            .insert({
              user_id: userId,
              name: "Weekly budget allocation",
              amount: 0,
              category: WEEKLY_CHARGE_CATEGORY,
              income: false,
              date: weekStartISO,
            })
            .select("id")
            .single();
          chargedWeekMap.set(weekStartISO, { id: (allocRow as { id: number })?.id ?? 0, amount: 0 });
        }
        const weekPurchases = purchaseRows.filter(
          (p) =>
            p.date &&
            weekStartToISODate(getWeekStartByChargeDay(new Date(p.date + "T12:00:00"), chargeDay)) === weekStartISO
        );
        const spent = weekPurchases.reduce((s, p) => s + (p.amount ?? 0), 0);
        const record = chargedWeekMap.get(weekStartISO);
        if (record && record.amount === 0) {
          if (spent > budgetLimit) {
            const overage = spent - budgetLimit;
            balanceAmount -= overage;
            if (balance) {
              await supabase
                .from("expenses")
                .update({ amount: balanceAmount })
                .eq("id", balance.id);
            }
            if (record.id) {
              await supabase
                .from("expenses")
                .update({ amount: overage })
                .eq("id", record.id);
            }
            chargedWeekMap.set(weekStartISO, { ...record, amount: overage });
          } else if (spent < budgetLimit) {
            const remaining = budgetLimit - spent;
            balanceAmount += remaining;
            if (balance) {
              await supabase
                .from("expenses")
                .update({ amount: balanceAmount })
                .eq("id", balance.id);
            }
            if (record.id) {
              await supabase
                .from("expenses")
                .update({ amount: -remaining })
                .eq("id", record.id);
            }
            chargedWeekMap.set(weekStartISO, { ...record, amount: -remaining });
          }
        }
        weekStart = addDays(weekStart, -7);
      }
    }

    setBalanceRow(
      balance
        ? { ...balance, amount: balanceAmount }
        : null
    );
    setWeeklyBudgetRow(weeklyBudget);
    setWeeklyPurchases(finalPurchaseRows);
    setRecurrenceExceptions(
      newExceptions.length > 0
        ? [...recurrenceExceptions, ...newExceptions]
        : recurrenceExceptions
    );
    setOverageRows(overageRowsData);
    setEvents(eventRows);
    setLoading(false);
  }, [userId, todayISO]);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    loadData();
  }, [userId, loadData]);

  useEffect(() => {
    if (balanceRow) setBalanceInput(String(balanceRow.amount ?? ""));
  }, [balanceRow]);

  useEffect(() => {
    if (weeklyBudgetRow) {
      setWeeklyBudgetInput(String(weeklyBudgetRow.amount ?? ""));
      setWeeklyBudgetChargeDay(weeklyBudgetRow.recurring_time != null ? (weeklyBudgetRow.recurring_time as number) : 0);
      setWeeklyBudgetStartDate(weeklyBudgetRow.date ?? "");
      setWeeklyBudgetEndDate(weeklyBudgetRow.end_date ?? "");
    }
  }, [weeklyBudgetRow]);

  async function saveStartingBalance() {
    if (!userId) return;
    const num = parseFloat(balanceInput.trim());
    if (Number.isNaN(num)) return;
    setSaving(true);
    setErrMsg(null);
    if (balanceRow) {
      const { error } = await supabase
        .from("expenses")
        .update({ amount: num })
        .eq("id", balanceRow.id);
      if (error) setErrMsg(error.message);
      else setBalanceRow((r) => (r ? { ...r, amount: num } : null));
    } else {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: userId,
          name: "Current balance",
          amount: num,
          category: BALANCE_CATEGORY,
          income: true,
          date: null,
        })
        .select()
        .single();
      if (error) setErrMsg(error.message);
      else if (data) setBalanceRow(data as ExpenseRow);
    }
    setSaving(false);
    setShowBalanceModal(false);
  }

  async function saveWeeklyBudget() {
    if (!userId) return;
    const num = parseFloat(weeklyBudgetInput.trim());
    if (Number.isNaN(num) || num < 0) return;
    setSaving(true);
    setErrMsg(null);
    const payload = {
      amount: num,
      recurring_time: weeklyBudgetChargeDay,
      recuring_length: "week",
      date: weeklyBudgetStartDate.trim() || null,
      end_date: weeklyBudgetEndDate.trim() || null,
      category: WEEKLY_BUDGET_CATEGORY,
    };
    if (weeklyBudgetRow) {
      const { error } = await supabase
        .from("expenses")
        .update(payload)
        .eq("id", weeklyBudgetRow.id);
      if (error) setErrMsg(error.message);
      else setWeeklyBudgetRow((r) => (r ? { ...r, ...payload } : null));
    } else {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: userId,
          name: "Weekly budget",
          ...payload,
          category: WEEKLY_BUDGET_CATEGORY,
          income: false,
        })
        .select()
        .single();
      if (error) setErrMsg(error.message);
      else if (data) setWeeklyBudgetRow(data as ExpenseRow);
    }
    setSaving(false);
    setShowWeeklyBudgetModal(false);
  }

  function openAddEvent() {
    setEditingEventRow(null);
    setDraftName("");
    setDraftAmount("");
    setDraftDate(toISODate(new Date()));
    setDraftCategory("");
    setDraftIncome(false);
    setDraftRecurring(false);
    setRecurrenceSectionOpen(false);
    setDraftTimes("1");
    setDraftEvery("1");
    setDraftRecurUnit("weeks");
    setDraftEndDate("");
    setAddEventOpen(true);
  }

  function openEditEvent(row: DisplayEventRow) {
    setAddEventOpen(false);
    const src = row.source;
    setDraftName(src.name ?? "");
    setDraftAmount(String(src.amount ?? ""));
    setDraftDate(row.occurrenceDate);
    setDraftCategory(src.category ?? "");
    setDraftIncome(src.income ?? false);
    setDraftOverage("0");
    const hasRecur = !!(src.end_date && (src.recuring_length || src.recurring_time != null));
    const isWeekly =
      src.category === WEEKLY_BUDGET_CATEGORY ||
      src.category === WEEKLY_BUDGET_CATEGORY_LEGACY;
    setDraftRecurring(hasRecur && !isWeekly);
    if (hasRecur && !isWeekly) {
      const p = parseRecurring(src.recuring_length, src.recurring_time);
      setDraftTimes(p ? String(p.times) : "1");
      setDraftEvery(p ? String(p.every) : "1");
      setDraftRecurUnit((p?.unit as RecurUnit) ?? "weeks");
      setDraftEndDate(src.end_date ?? "");
    } else {
      setDraftTimes("1");
      setDraftEvery("1");
      setDraftRecurUnit("weeks");
      setDraftEndDate("");
    }
    setRecurrenceSectionOpen(false);
    setEditingEventRow(row);
  }

  function closeEditEvent() {
    setEditingEventRow(null);
  }

  async function saveEditEvent() {
    if (!editingEventRow) return;
    const src = editingEventRow.source;
    const amount = parseFloat(draftAmount.trim());
    if (Number.isNaN(amount)) return;
    const timesNum = draftRecurring
      ? Math.max(1, parseInt(draftTimes, 10) || 1)
      : 1;
    const everyNum = draftRecurring
      ? Math.max(1, parseInt(draftEvery, 10) || 1)
      : null;
    const recuringLength = draftRecurring
      ? timesNum === 1
        ? draftRecurUnit
        : `${timesNum}_${draftRecurUnit}`
      : null;
    setSaving(true);
    setErrMsg(null);
    const payload = {
      name: draftName.trim() || null,
      amount,
      date: editingEventRow.isExpanded ? src.date : draftDate.trim() || null,
      category: draftCategory.trim() || null,
      income: draftIncome,
      recurring_time: everyNum,
      recuring_length: recuringLength,
      end_date: draftRecurring && draftEndDate.trim() ? draftEndDate.trim() : null,
    };
    const { error } = await supabase
      .from("expenses")
      .update(payload)
      .eq("id", src.id);
    setSaving(false);
    if (error) setErrMsg(error.message);
    else {
      setEvents((prev) =>
        prev.map((e) => (e.id === src.id ? { ...e, ...payload } : e))
      );
      if (
        src.category === WEEKLY_BUDGET_CATEGORY ||
        src.category === WEEKLY_BUDGET_CATEGORY_LEGACY
      )
        setWeeklyBudgetRow((r) =>
          r && r.id === src.id ? { ...r, ...payload } : r
        );
    }
    closeEditEvent();
  }

  async function deleteThisOccurrence() {
    if (!editingEventRow?.isExpanded || !userId) return;
    const src = editingEventRow.source;
    setSaving(true);
    setErrMsg(null);
    const { error } = await supabase.from("expenses").insert({
      user_id: userId,
      name: `exception:${src.id}`,
      amount: 0,
      date: editingEventRow.occurrenceDate,
      category: RECURRENCE_EXCEPTION_CATEGORY,
      income: false,
    });
    setSaving(false);
    if (error) setErrMsg(error.message);
    else {
      setRecurrenceExceptions((prev) => [
        ...prev,
        { eventId: src.id, date: editingEventRow!.occurrenceDate },
      ]);
    }
    closeEditEvent();
  }

  async function addOverage() {
    if (!editingEventRow?.isExpanded || !userId || !balanceRow) return;
    const overageNum = parseFloat(draftOverage.trim());
    if (Number.isNaN(overageNum) || overageNum === 0) return;
    const src = editingEventRow.source;
    setSaving(true);
    setErrMsg(null);
    const { data, error } = await supabase
      .from("expenses")
      .insert({
        user_id: userId,
        name: `overage:${src.id}:${editingEventRow.occurrenceDate}`,
        amount: overageNum,
        date: editingEventRow.occurrenceDate,
        category: OVERAGE_CATEGORY,
        income: src.income ?? false,
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      setErrMsg(error.message);
      return;
    }
    const newRow = data as ExpenseRow;
    setOverageRows((prev) => [...prev, newRow]);
    const newBalance = currentBalance + (src.income ? overageNum : -overageNum);
    await supabase.from("expenses").update({ amount: newBalance }).eq("id", balanceRow.id);
    setBalanceRow((r) => (r ? { ...r, amount: newBalance } : null));
    setDraftOverage("0");
  }

  async function saveNewEvent() {
    if (!userId) return;
    const amount = parseFloat(draftAmount.trim());
    if (Number.isNaN(amount) || !draftDate.trim()) return;
    const timesNum = draftRecurring ? Math.max(1, parseInt(draftTimes, 10) || 1) : 1;
    const everyNum = draftRecurring ? Math.max(1, parseInt(draftEvery, 10) || 1) : null;
    const recuringLength = draftRecurring
      ? (timesNum === 1 ? draftRecurUnit : `${timesNum}_${draftRecurUnit}`)
      : null;
    setSaving(true);
    setErrMsg(null);
    const payload: Record<string, unknown> = {
      user_id: userId,
      name: draftName.trim() || null,
      amount,
      date: draftDate.trim() || null,
      category: draftCategory.trim() || null,
      income: draftIncome,
      recurring_time: everyNum,
      recuring_length: recuringLength,
      end_date: draftRecurring && draftEndDate.trim() ? draftEndDate.trim() : null,
    };
    const { data, error } = await supabase
      .from("expenses")
      .insert(payload)
      .select()
      .single();
    setSaving(false);
    if (error) setErrMsg(error.message);
    else if (data) {
      setEvents((prev) => [...prev, data as ExpenseRow]);
      setAddEventOpen(false);
    }
  }

  async function updateEventField(
    row: ExpenseRow,
    field: "amount" | "date" | "end_date",
    value: string
  ) {
    const num = field === "amount" ? parseFloat(value) : null;
    const payload =
      field === "amount"
        ? { amount: Number.isNaN(num!) ? row.amount : num }
        : field === "date"
        ? { date: value || null }
        : { end_date: value || null };
    const { error } = await supabase
      .from("expenses")
      .update(payload)
      .eq("id", row.id);
    if (error) setErrMsg(error.message);
    else {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === row.id ? { ...e, ...payload } : e
        )
      );
      if (
        row.category === WEEKLY_BUDGET_CATEGORY ||
        row.category === WEEKLY_BUDGET_CATEGORY_LEGACY
      )
        setWeeklyBudgetRow((r) => (r && r.id === row.id ? { ...r, ...payload } : r));
    }
    setEditingCell(null);
  }

  async function deleteEvent(row: ExpenseRow) {
    const { error } = await supabase.from("expenses").delete().eq("id", row.id);
    if (error) setErrMsg(error.message);
    else {
      if (
        row.category === WEEKLY_BUDGET_CATEGORY ||
        row.category === WEEKLY_BUDGET_CATEGORY_LEGACY
      )
        setWeeklyBudgetRow(null);
      else setEvents((prev) => prev.filter((e) => e.id !== row.id));
    }
  }

  function openAddItem() {
    setItemName("");
    setItemAmount("");
    setItemDate(toISODate(new Date()));
    setAddItemOpen(true);
  }

  async function saveNewItem() {
    if (!userId) return;
    const amount = parseFloat(itemAmount.trim());
    if (Number.isNaN(amount)) return;
    setSaving(true);
    setErrMsg(null);
    const { data, error } = await supabase
      .from("expenses")
      .insert({
        user_id: userId,
        name: itemName.trim() || null,
        amount,
        date: itemDate.trim() || null,
        category: WEEKLY_PURCHASE_CATEGORY,
        income: false,
      })
      .select()
      .single();
    setSaving(false);
    if (error) setErrMsg(error.message);
    else if (data) {
      setWeeklyPurchases((prev) => [...prev, data as ExpenseRow]);
      setAddItemOpen(false);
    }
  }

  async function deletePurchase(row: ExpenseRow) {
    const { error } = await supabase.from("expenses").delete().eq("id", row.id);
    if (error) setErrMsg(error.message);
    else setWeeklyPurchases((prev) => prev.filter((e) => e.id !== row.id));
  }

  const isEditing = (id: number, field: "amount" | "date" | "end_date") =>
    editingCell?.id === id && editingCell?.field === field;

  return (
    <div className="min-h-screen bg-background text-text">
      <Head>
        <title>Expenses</title>
      </Head>
      <NavBar />
      <div className="mx-auto flex flex-col items-center px-4 py-6">
        {errMsg ? (
          <div className="mb-4 w-full max-w-6xl rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-text">
            {errMsg}
          </div>
        ) : null}

        <div className="w-full max-w-6xl space-y-6">
          <div className="flex justify-end">
            <PageColorPicker />
          </div>

          {/* Starting balance */}
          <section className="rounded-2xl border border-primary/20 bg-secondary/50 p-6">
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-text/80">
              Current balance
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-2xl font-semibold text-text">
                ${currentBalance.toFixed(2)}
              </span>
              <button
                type="button"
                onClick={() => setShowBalanceModal(true)}
                className="rounded-lg border border-primary/40 px-3 py-1.5 text-sm text-text hover:bg-primary/20"
              >
                Set starting balance
              </button>
            </div>
          </section>

          {/* Weekly budget */}
          <section className="rounded-2xl border border-primary/20 bg-secondary/50 p-6">
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-text/80">
              Weekly budget
            </h2>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div>
                <span className="text-text/70">Budget: </span>
                <span className="font-medium text-text">
                  ${weeklyBudgetAmount.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-text/70">Charge day: </span>
                <span className="font-medium text-text">
                  {CHARGE_DAY_OPTIONS[chargeDay]?.label ?? "—"}
                </span>
              </div>
              {weeklyBudgetRow?.date ? (
                <div>
                  <span className="text-text/70">Starts: </span>
                  <span className="font-medium text-text">
                    {weeklyBudgetRow.date}
                  </span>
                </div>
              ) : null}
              {weeklyBudgetRow?.end_date ? (
                <div>
                  <span className="text-text/70">Ends: </span>
                  <span className="font-medium text-text">
                    {weeklyBudgetRow.end_date}
                  </span>
                </div>
              ) : null}
              <div>
                <span className="text-text/70">Spent this week: </span>
                <span
                  className={
                    weeklyBudgetAmount > 0 && spentThisWeek > weeklyBudgetAmount
                      ? "font-medium text-red-400"
                      : "font-medium text-text"
                  }
                >
                  ${spentThisWeek.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-text/70">Remaining this week: </span>
                <span
                  className={
                    weeklyBudgetAmount > 0 && spentThisWeek > weeklyBudgetAmount
                      ? "font-semibold text-red-400"
                      : "font-semibold text-text"
                  }
                >
                  ${Math.max(0, weeklyBudgetAmount - spentThisWeek).toFixed(2)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowWeeklyBudgetModal(true)}
                className="rounded-lg border border-primary/40 px-3 py-1.5 text-sm text-text hover:bg-primary/20"
              >
                {weeklyBudgetRow ? "Edit" : "Set"} weekly budget
              </button>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-text/70">
                Items purchased this week
              </h3>
              <ul className="space-y-2 mb-2">
                {purchasesThisWeek.length === 0 ? (
                  <li className="rounded-xl border border-dashed border-primary/30 py-3 text-center text-sm text-text/60">
                    No items yet. Add purchases to track spending.
                  </li>
                ) : (
                  purchasesThisWeek.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-background/50 px-3 py-2"
                    >
                      <span className="text-text">{p.name ?? "—"}</span>
                      <span className="text-text/80">${(p.amount ?? 0).toFixed(2)}</span>
                      <span className="text-text/60 text-xs">{p.date ?? ""}</span>
                      <button
                        type="button"
                        onClick={() => deletePurchase(p)}
                        className="rounded border border-red-500/50 px-2 py-0.5 text-xs text-red-400 hover:bg-red-500/20"
                      >
                        Delete
                      </button>
                    </li>
                  ))
                )}
              </ul>
              <button
                type="button"
                onClick={openAddItem}
                className="rounded-lg border border-primary/40 px-3 py-1.5 text-sm text-text hover:bg-primary/20"
              >
                Add item
              </button>
            </div>
          </section>

          {/* Events table (Excel-like) */}
          <section className="rounded-2xl border border-primary/20 bg-secondary/50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium uppercase tracking-wide text-text/80">
                Scheduled events
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPastEvents((v) => !v)}
                  className={`rounded-lg border px-3 py-1.5 text-sm hover:bg-primary/20 ${
                    showPastEvents
                      ? "border-primary bg-primary/20 text-text"
                      : "border-primary/40 text-text"
                  }`}
                >
                  {showPastEvents ? "Hide past events" : "Show past events"}
                </button>
                <button
                  type="button"
                  onClick={openAddEvent}
                  className="rounded-lg border border-primary/40 px-3 py-1.5 text-sm text-text hover:bg-primary/20"
                >
                  + Add event
                </button>
              </div>
            </div>

            {loading ? (
              <p className="py-4 text-center text-sm text-text/70">Loading…</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-primary/30">
                      <th className="text-left py-2 px-2 font-medium text-text/80">
                        Name
                      </th>
                      <th className="text-right py-2 px-2 font-medium text-text/80 w-28">
                        Amount
                      </th>
                      <th className="text-left py-2 px-2 font-medium text-text/80 w-36">
                        Date
                      </th>
                      <th className="text-left py-2 px-2 font-medium text-text/80">
                        Category
                      </th>
                      <th className="text-left py-2 px-2 font-medium text-text/80 w-20">
                        Type
                      </th>
                      <th className="text-left py-2 px-2 font-medium text-text/80 min-w-[8rem]">
                        Recurrence
                      </th>
                      <th className="text-right py-2 px-2 font-medium text-text/80 w-28">
                        Balance after
                      </th>
                      <th className="w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {eventsDisplayRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="py-6 text-center text-text/60 border-b border-primary/20"
                        >
                          No scheduled events. Add one to see it here; when the
                          date is reached it will deduct from your balance and
                          be hidden (toggle &quot;Show past events&quot; to see them).
                        </td>
                      </tr>
                    ) : (
                      eventsDisplayRows.map((row, idx) => {
                        const src = row.source;
                        const rowKey = row.isExpanded
                          ? `exp-${src.id}-${row.occurrenceDate}`
                          : src.id;
                        const balanceAfter = balanceAfterEachRow[idx];
                        const isNextOccurrence =
                          row.isExpanded &&
                          nextOccurrenceDateBySourceId.get(src.id) === row.occurrenceDate;
                        const canEditDate = !row.isExpanded || isNextOccurrence;
                        return (
                        <tr
                          key={rowKey}
                          className="border-b border-primary/20 hover:bg-primary/5"
                        >
                          <td className="py-2 px-2 text-text">
                            {src.name ?? "—"}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {!row.isExpanded && isEditing(src.id, "amount") ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editingCell!.value}
                                onChange={(e) =>
                                  setEditingCell((c) =>
                                    c ? { ...c, value: e.target.value } : null
                                  )
                                }
                                onBlur={() =>
                                  updateEventField(src, "amount", editingCell!.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    updateEventField(src, "amount", editingCell!.value);
                                  if (e.key === "Escape") setEditingCell(null);
                                }}
                                autoFocus
                                className="w-full min-w-0 rounded border border-primary/40 bg-background px-2 py-1 text-right text-text outline-none focus:ring-1 focus:ring-primary/40"
                              />
                            ) : !row.isExpanded ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingCell({
                                    id: src.id,
                                    field: "amount",
                                    value: String(src.amount ?? ""),
                                  })
                                }
                                className="w-full text-right hover:bg-primary/10 rounded px-1 py-0.5 -mx-1"
                              >
                                {src.income ? "+" : "-"}
                                ${(src.amount ?? 0).toFixed(2)}
                              </button>
                            ) : (
                              <span className="block w-full text-right px-1 py-0.5">
                                {src.income ? "+" : "-"}
                                ${(row.effectiveAmount ?? src.amount ?? 0).toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2">
                            {!canEditDate ? (
                              <span className="text-text/80">{row.occurrenceDate}</span>
                            ) : isEditing(src.id, "date") ? (
                              <input
                                type="date"
                                value={editingCell!.value}
                                onChange={(e) =>
                                  setEditingCell((c) =>
                                    c ? { ...c, value: e.target.value } : null
                                  )
                                }
                                onBlur={() =>
                                  updateEventField(src, "date", editingCell!.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    updateEventField(src, "date", editingCell!.value);
                                  if (e.key === "Escape") setEditingCell(null);
                                }}
                                autoFocus
                                className="w-full min-w-0 rounded border border-primary/40 bg-background px-2 py-1 text-text outline-none focus:ring-1 focus:ring-primary/40"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingCell({
                                    id: src.id,
                                    field: "date",
                                    value: row.isExpanded ? row.occurrenceDate : (src.date ?? ""),
                                  })
                                }
                                className="w-full text-left hover:bg-primary/10 rounded px-1 py-0.5 -mx-1"
                              >
                                {row.isExpanded ? row.occurrenceDate : (src.date ?? "—")}
                              </button>
                            )}
                          </td>
                          <td className="py-2 px-2 text-text/80">
                            {displayCategory(src)}
                          </td>
                          <td className="py-2 px-2 text-text/80">
                            {src.income ? "Income" : "Expense"}
                          </td>
                          <td className="py-2 px-2 text-text/80 text-xs">
                            {formatRecurring(src)}
                          </td>
                          <td className="py-2 px-2 text-right font-medium text-text">
                            ${(balanceAfter ?? currentBalance).toFixed(2)}
                          </td>
                          <td className="py-2 px-2">
                            <button
                              type="button"
                              onClick={() => openEditEvent(row)}
                              className="rounded border border-primary/40 px-2 py-0.5 text-xs text-text hover:bg-primary/20"
                              title={row.isExpanded ? "Edit this occurrence (overage) or recurring series" : "Edit event"}
                            >
                              {row.isExpanded ? "Edit" : "Edit"}
                            </button>
                          </td>
                        </tr>
                      );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      <Modal
        open={showBalanceModal}
        title="Set starting balance"
        onClose={() => setShowBalanceModal(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text">
              Current balance
            </label>
            <input
              type="number"
              step="0.01"
              value={balanceInput}
              onChange={(e) => setBalanceInput(e.target.value)}
              className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="0.00"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowBalanceModal(false)}
              className="rounded-lg border border-primary/40 px-4 py-2 text-sm text-text hover:bg-primary/20"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveStartingBalance}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-reverse disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showWeeklyBudgetModal}
        title="Set weekly budget"
        onClose={() => setShowWeeklyBudgetModal(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text">
              Weekly budget amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={weeklyBudgetInput}
              onChange={(e) => setWeeklyBudgetInput(e.target.value)}
              className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text">
              Start date (first date of the budget — assumed to be the date you set)
            </label>
            <input
              type="date"
              value={weeklyBudgetStartDate}
              onChange={(e) => setWeeklyBudgetStartDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text">
              Charge day (when to apply overage to balance)
            </label>
            <select
              value={weeklyBudgetChargeDay}
              onChange={(e) => setWeeklyBudgetChargeDay(parseInt(e.target.value, 10))}
              className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
            >
              {CHARGE_DAY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text">
              End date (when to stop charging)
            </label>
            <input
              type="date"
              value={weeklyBudgetEndDate}
              onChange={(e) => setWeeklyBudgetEndDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowWeeklyBudgetModal(false)}
              className="rounded-lg border border-primary/40 px-4 py-2 text-sm text-text hover:bg-primary/20"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveWeeklyBudget}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-reverse disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={addEventOpen} title="Add event" onClose={() => setAddEventOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text">Name</label>
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="e.g. Rent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text">Amount *</label>
            <input
              type="number"
              step="0.01"
              value={draftAmount}
              onChange={(e) => setDraftAmount(e.target.value)}
              className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text">Date *</label>
            <input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text">Category</label>
            <input
              value={draftCategory}
              onChange={(e) => setDraftCategory(e.target.value)}
              className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="e.g. Bills"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="draft-income"
              checked={draftIncome}
              onChange={(e) => setDraftIncome(e.target.checked)}
              className="rounded border-primary/40"
            />
            <label htmlFor="draft-income" className="text-sm text-text">
              Income (adds to balance)
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="draft-recurring"
              checked={draftRecurring}
              onChange={(e) => {
                const next = e.target.checked;
                if (next) setRecurrenceSectionOpen(true);
                setDraftRecurring(next);
              }}
              className="rounded border-primary/40"
            />
            <label htmlFor="draft-recurring" className="text-sm text-text">
              Recurring event
            </label>
            {draftRecurring && (
              <button
                type="button"
                onClick={() => setRecurrenceSectionOpen((v) => !v)}
                className="rounded border border-primary/40 p-0.5 text-text hover:bg-primary/20"
                aria-label={recurrenceSectionOpen ? "Collapse recurrence" : "Expand recurrence"}
              >
                {recurrenceSectionOpen ? (
                  <span className="inline-block text-xs">&#9650;</span>
                ) : (
                  <span className="inline-block text-xs">&#9660;</span>
                )}
              </button>
            )}
          </div>
          {draftRecurring && recurrenceSectionOpen && (
            <>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-background/50 p-3">
                <label className="text-sm text-text/80">Recurrence:</label>
                <input
                  type="number"
                  min={1}
                  value={draftTimes}
                  onChange={(e) => setDraftTimes(e.target.value)}
                  className="w-16 rounded-lg border border-primary/30 bg-background px-2 py-1.5 text-sm text-text outline-none focus:ring-1 focus:ring-primary/40"
                />
                <span className="text-sm text-text/80">times every</span>
                <input
                  type="number"
                  min={1}
                  value={draftEvery}
                  onChange={(e) => setDraftEvery(e.target.value)}
                  className="w-16 rounded-lg border border-primary/30 bg-background px-2 py-1.5 text-sm text-text outline-none focus:ring-1 focus:ring-primary/40"
                />
                <select
                  value={draftRecurUnit}
                  onChange={(e) => setDraftRecurUnit(e.target.value as RecurUnit)}
                  className="rounded-lg border border-primary/30 bg-background px-2 py-1.5 text-sm text-text outline-none focus:ring-1 focus:ring-primary/40"
                >
                  {RECUR_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text">
                  End date
                </label>
                <input
                  type="date"
                  value={draftEndDate}
                  onChange={(e) => setDraftEndDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddEventOpen(false)}
              className="rounded-lg border border-primary/40 px-4 py-2 text-sm text-text hover:bg-primary/20"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveNewEvent}
              disabled={
                saving ||
                !draftAmount.trim() ||
                Number.isNaN(parseFloat(draftAmount)) ||
                !draftDate.trim()
              }
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-reverse disabled:opacity-50"
            >
              {saving ? "Saving…" : "Add"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!editingEventRow}
        title="Edit event"
        onClose={closeEditEvent}
      >
        {editingEventRow && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-text">Name</label>
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="e.g. Rent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text">Amount *</label>
              <input
                type="number"
                step="0.01"
                value={draftAmount}
                onChange={(e) => setDraftAmount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text">
                {editingEventRow.isExpanded ? "This occurrence date" : "Date *"}
              </label>
              <input
                type="date"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                readOnly={editingEventRow.isExpanded}
                className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-70"
              />
            </div>
            {editingEventRow.isExpanded && (
              <div>
                <label className="block text-sm font-medium text-text">Overage *</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={draftOverage}
                    onChange={(e) => setDraftOverage(e.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="0.00"
                  />
                  <button
                    type="button"
                    onClick={addOverage}
                    disabled={
                      saving ||
                      !draftOverage.trim() ||
                      Number.isNaN(parseFloat(draftOverage)) ||
                      parseFloat(draftOverage) === 0 ||
                      !balanceRow
                    }
                    className="shrink-0 rounded-lg border border-primary/40 px-3 py-1.5 text-sm text-text hover:bg-primary/20 disabled:opacity-50"
                  >
                    Add overage
                  </button>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-text">Category</label>
              <input
                value={draftCategory}
                onChange={(e) => setDraftCategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="e.g. Bills"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-draft-income"
                checked={draftIncome}
                onChange={(e) => setDraftIncome(e.target.checked)}
                className="rounded border-primary/40"
              />
              <label htmlFor="edit-draft-income" className="text-sm text-text">
                Income (adds to balance)
              </label>
            </div>
            {!(
              editingEventRow.source.category === WEEKLY_BUDGET_CATEGORY ||
              editingEventRow.source.category === WEEKLY_BUDGET_CATEGORY_LEGACY
            ) && (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-draft-recurring"
                    checked={draftRecurring}
                    onChange={(e) => {
                      const next = e.target.checked;
                      if (next) setRecurrenceSectionOpen(true);
                      setDraftRecurring(next);
                    }}
                    className="rounded border-primary/40"
                  />
                  <label htmlFor="edit-draft-recurring" className="text-sm text-text">
                    Recurring event
                  </label>
                  {draftRecurring && (
                    <button
                      type="button"
                      onClick={() => setRecurrenceSectionOpen((v) => !v)}
                      className="rounded border border-primary/40 p-0.5 text-text hover:bg-primary/20"
                      aria-label={recurrenceSectionOpen ? "Collapse recurrence" : "Expand recurrence"}
                    >
                      {recurrenceSectionOpen ? (
                        <span className="inline-block text-xs">&#9650;</span>
                      ) : (
                        <span className="inline-block text-xs">&#9660;</span>
                      )}
                    </button>
                  )}
                </div>
                {draftRecurring && recurrenceSectionOpen && (
                  <>
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-background/50 p-3">
                      <label className="text-sm text-text/80">Recurrence:</label>
                      <input
                        type="number"
                        min={1}
                        value={draftTimes}
                        onChange={(e) => setDraftTimes(e.target.value)}
                        className="w-16 rounded-lg border border-primary/30 bg-background px-2 py-1.5 text-sm text-text outline-none focus:ring-1 focus:ring-primary/40"
                      />
                      <span className="text-sm text-text/80">times every</span>
                      <input
                        type="number"
                        min={1}
                        value={draftEvery}
                        onChange={(e) => setDraftEvery(e.target.value)}
                        className="w-16 rounded-lg border border-primary/30 bg-background px-2 py-1.5 text-sm text-text outline-none focus:ring-1 focus:ring-primary/40"
                      />
                      <select
                        value={draftRecurUnit}
                        onChange={(e) =>
                          setDraftRecurUnit(e.target.value as RecurUnit)
                        }
                        className="rounded-lg border border-primary/30 bg-background px-2 py-1.5 text-sm text-text outline-none focus:ring-1 focus:ring-primary/40"
                      >
                        {RECUR_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text">
                        End date
                      </label>
                      <input
                        type="date"
                        value={draftEndDate}
                        onChange={(e) => setDraftEndDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </>
                )}
              </>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-primary/20">
              <button
                type="button"
                onClick={saveEditEvent}
                disabled={saving || !draftAmount.trim() || Number.isNaN(parseFloat(draftAmount))}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-reverse disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={closeEditEvent}
                className="rounded-lg border border-primary/40 px-4 py-2 text-sm text-text hover:bg-primary/20"
              >
                Cancel
              </button>
            </div>
            <div className="border-t border-primary/20 pt-4">
              <div className="flex flex-wrap gap-2">
                {editingEventRow.isExpanded ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        deleteThisOccurrence();
                      }}
                      disabled={saving}
                      className="rounded-lg border border-red-500/50 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      Delete this occurrence
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteEvent(editingEventRow.source);
                        closeEditEvent();
                      }}
                      disabled={saving}
                      className="rounded-lg border border-red-500/50 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      Delete entire series
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      deleteEvent(editingEventRow.source);
                      closeEditEvent();
                    }}
                    disabled={saving}
                    className="rounded-lg border border-red-500/50 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    Delete event
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={addItemOpen} title="Add item" onClose={() => setAddItemOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text">Name</label>
            <input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="e.g. Groceries"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text">Amount *</label>
            <input
              type="number"
              step="0.01"
              value={itemAmount}
              onChange={(e) => setItemAmount(e.target.value)}
              className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text">Date (day of purchase)</label>
            <input
              type="date"
              value={itemDate}
              onChange={(e) => setItemDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddItemOpen(false)}
              className="rounded-lg border border-primary/40 px-4 py-2 text-sm text-text hover:bg-primary/20"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveNewItem}
              disabled={saving || !itemAmount.trim() || Number.isNaN(parseFloat(itemAmount))}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-reverse disabled:opacity-50"
            >
              {saving ? "Saving…" : "Add"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
