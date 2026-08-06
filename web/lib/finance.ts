import { supabase } from "@/lib/supabaseClient";

export type Account = {
  id: number;
  created_at: string;
  user_id: string;
  name: string;
  account_type: "bank" | "debt";
  starting_balance: number;
};

export type RecurringRule = {
  id: number;
  created_at: string;
  user_id: string;
  name: string;
  amount: number;
  is_income: boolean;
  category: string | null;
  interval_every: number;
  interval_unit: "days" | "weeks" | "months" | "years";
  start_date: string;
  end_date: string | null;
  account_id: number | null;
  counterparty: string | null;
  last_materialized_date: string | null;
  skip_dates: string[] | null;
};

export type Transaction = {
  id: number;
  created_at: string;
  user_id: string;
  name: string;
  amount: number;
  date: string;
  account_id: number | null;
  counterparty: string | null;
  is_income: boolean;
  recurring_rule_id: number | null;
  category: string | null;
  /** User-edited occurrence — not updated when the parent rule changes. */
  detached: boolean;
};

export type FinanceProfile = {
  user_id: string;
  onboarded_at: string | null;
  last_expense_prompt_date: string | null;
};

export function toISODate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatMoney(n: number) {
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (n < 0) return `-$${formatted}`;
  return `$${formatted}`;
}

export function addInterval(
  dateStr: string,
  every: number,
  unit: RecurringRule["interval_unit"]
): string {
  const d = new Date(dateStr + "T12:00:00");
  if (unit === "days") d.setDate(d.getDate() + every);
  else if (unit === "weeks") d.setDate(d.getDate() + every * 7);
  else if (unit === "months") d.setMonth(d.getMonth() + every);
  else d.setFullYear(d.getFullYear() + every);
  return toISODate(d);
}

export type UpcomingEvent = {
  key: string;
  date: string;
  name: string;
  amount: number;
  is_income: boolean;
  counterparty: string | null;
  source: "recurring" | "transaction";
  rule_id?: number;
  tx_id?: number;
  /** True when this occurrence was user-edited (detached from rule updates). */
  amount_overridden?: boolean;
  balance_after?: number;
};

function skipSet(rule: RecurringRule): Set<string> {
  return new Set((rule.skip_dates ?? []).map((d) => d.slice(0, 10)));
}

/** Next occurrence strictly after `after` (YYYY-MM-DD), based on start_date schedule. */
export function nextOccurrenceAfter(
  rule: RecurringRule,
  after: string
): string | null {
  let cursor = rule.start_date;
  let guard = 0;
  while (cursor <= after && guard < 2000) {
    cursor = addInterval(cursor, rule.interval_every, rule.interval_unit);
    guard += 1;
  }
  if (rule.end_date && cursor > rule.end_date) return null;
  if (cursor <= after) return null;
  return cursor;
}

/** Upcoming charges/income from recurring rules + future one-off transactions. */
export function listUpcomingEvents(
  rules: RecurringRule[],
  txs: Transaction[],
  today = toISODate(),
  horizonMonths = 18
): UpcomingEvent[] {
  const end = addInterval(today, horizonMonths, "months");
  const events: UpcomingEvent[] = [];
  const seenTxIds = new Set<number>();

  const txByRuleDate = new Map<string, Transaction>();
  for (const tx of txs) {
    if (tx.recurring_rule_id == null) continue;
    txByRuleDate.set(`${tx.recurring_rule_id}:${tx.date}`, tx);
  }

  for (const rule of rules) {
    if (rule.end_date && rule.end_date < today) continue;
    const skips = skipSet(rule);
    let next = nextOccurrenceAfter(rule, today);
    if (!next) continue;

    let cursor: string | null = next;
    let guard = 0;
    while (cursor && cursor <= end && guard < 200) {
      if (rule.end_date && cursor > rule.end_date) break;
      if (!skips.has(cursor)) {
        const override = txByRuleDate.get(`${rule.id}:${cursor}`);
        // Detached overrides keep their own fields forever; non-detached
        // (auto-materialized) still display stored values for that date.
        if (override) {
          seenTxIds.add(override.id);
          events.push({
            key: `rule-${rule.id}-${cursor}`,
            date: cursor,
            name: override.name,
            amount: Number(override.amount) || 0,
            is_income: override.is_income,
            counterparty: override.counterparty,
            source: "recurring",
            rule_id: rule.id,
            tx_id: override.id,
            amount_overridden: Boolean(override.detached),
          });
        } else {
          events.push({
            key: `rule-${rule.id}-${cursor}`,
            date: cursor,
            name: rule.name,
            amount: Number(rule.amount) || 0,
            is_income: rule.is_income,
            counterparty: rule.counterparty,
            source: "recurring",
            rule_id: rule.id,
            amount_overridden: false,
          });
        }
      }
      cursor = addInterval(cursor, rule.interval_every, rule.interval_unit);
      guard += 1;
    }
  }

  // Detached overrides moved off the rule schedule still show as upcoming
  for (const tx of txs) {
    if (tx.date <= today) continue;
    if (tx.recurring_rule_id == null) continue;
    if (seenTxIds.has(tx.id)) continue;
    if (!tx.detached) continue;
    events.push({
      key: `tx-detached-${tx.id}`,
      date: tx.date,
      name: tx.name,
      amount: Number(tx.amount) || 0,
      is_income: tx.is_income,
      counterparty: tx.counterparty,
      source: "recurring",
      rule_id: tx.recurring_rule_id,
      tx_id: tx.id,
      amount_overridden: true,
    });
  }

  for (const tx of txs) {
    if (tx.date <= today) continue;
    if (tx.recurring_rule_id != null) continue;
    events.push({
      key: `tx-${tx.id}`,
      date: tx.date,
      name: tx.name,
      amount: Number(tx.amount) || 0,
      is_income: tx.is_income,
      counterparty: tx.counterparty,
      source: "transaction",
      tx_id: tx.id,
    });
  }

  events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.name.localeCompare(b.name);
  });
  return events;
}

/** Attach running balance after each upcoming event. */
export function withProjectedBalances(
  events: UpcomingEvent[],
  startingBalance: number
): UpcomingEvent[] {
  let running = startingBalance;
  return events.map((ev) => {
    running += ev.is_income ? ev.amount : -ev.amount;
    return { ...ev, balance_after: running };
  });
}

/** Expand recurring rules into transactions up through today. */
export async function materializeRecurring(
  userId: string,
  today = toISODate(new Date())
) {
  const { data: rules, error } = await supabase
    .from("recurring_rules")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;

  for (const rule of (rules ?? []) as RecurringRule[]) {
    let next = rule.last_materialized_date
      ? addInterval(
          rule.last_materialized_date,
          rule.interval_every,
          rule.interval_unit
        )
      : rule.start_date;
    let lastDone = rule.last_materialized_date;

    while (next <= today) {
      if (rule.end_date && next > rule.end_date) break;

      const skips = skipSet(rule);
      if (!skips.has(next)) {
        const { data: existing } = await supabase
          .from("transactions")
          .select("id")
          .eq("user_id", userId)
          .eq("recurring_rule_id", rule.id)
          .eq("date", next)
          .maybeSingle();

        if (!existing) {
          const { error: insErr } = await supabase.from("transactions").insert({
            user_id: userId,
            name: rule.name,
            amount: rule.amount,
            date: next,
            account_id: rule.account_id,
            counterparty: rule.counterparty,
            is_income: rule.is_income,
            recurring_rule_id: rule.id,
            category: rule.category,
            detached: false,
          });
          if (insErr) throw insErr;
        }
      }

      lastDone = next;
      next = addInterval(next, rule.interval_every, rule.interval_unit);
    }

    if (lastDone && lastDone !== rule.last_materialized_date) {
      const { error: upErr } = await supabase
        .from("recurring_rules")
        .update({ last_materialized_date: lastDone })
        .eq("id", rule.id);
      if (upErr) throw upErr;
    }
  }
}

const MAGIC_CATEGORIES = new Set([
  "_balance",
  "Weekly Budget",
  "_weekly_budget",
  "_weekly_purchase",
  "_weekly_charge",
  "_recurrence_exception",
  "_overage",
  "_hidden",
]);

function parseRecurring(
  recuring_length: string | null,
  recurring_time: number | null
): { every: number; unit: RecurringRule["interval_unit"] } | null {
  if (!recuring_length || recurring_time == null) return null;
  const parts = recuring_length.split("_");
  if (parts.length >= 2) {
    const unitRaw = parts.slice(1).join("_");
    const unit = normalizeUnit(unitRaw);
    if (!unit) return null;
    return { every: recurring_time, unit };
  }
  const unit = normalizeUnit(recuring_length);
  if (!unit) return null;
  return { every: recurring_time || 1, unit };
}

function normalizeUnit(s: string): RecurringRule["interval_unit"] | null {
  const x = s.toLowerCase();
  if (x === "day" || x === "days") return "days";
  if (x === "week" || x === "weeks") return "weeks";
  if (x === "month" || x === "months") return "months";
  if (x === "year" || x === "years") return "years";
  return null;
}

/**
 * Client-side fallback if SQL migration 006 was not run.
 * Prefer running web/supabase/migrations/006_finance_migrate_legacy.sql.
 */
export async function migrateLegacyFinance(userId: string) {
  const { data: profile } = await supabase
    .from("finance_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  const { count: txCount } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const { count: ruleCount } = await supabase
    .from("recurring_rules")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const { count: accountCount } = await supabase
    .from("accounts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (
    (txCount ?? 0) > 0 ||
    (ruleCount ?? 0) > 0 ||
    (accountCount ?? 0) > 0 ||
    profile
  ) {
    return { migrated: false, reason: "already_has_data" as const };
  }

  const today = toISODate();

  const { data: balances } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", userId)
    .eq("category", "_balance");

  for (const b of balances ?? []) {
    await supabase.from("accounts").insert({
      user_id: userId,
      name: "Checking",
      account_type: "bank",
      starting_balance: Number(b.amount) || 0,
    });
  }

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId);

  for (const s of subs ?? []) {
    const start = s.end || today;
    await supabase.from("recurring_rules").insert({
      user_id: userId,
      name: s.name ?? "Subscription",
      amount: Math.abs(s.amount ?? 0),
      is_income: false,
      category: "subscription",
      interval_every: 1,
      interval_unit: "months",
      start_date: start,
      end_date: null,
      counterparty: s.name,
      last_materialized_date: today,
    });
  }

  const { data: expenses } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", userId);

  const { data: bankAccounts } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("account_type", "bank")
    .order("id")
    .limit(1);
  const defaultAccountId = bankAccounts?.[0]?.id ?? null;

  for (const e of expenses ?? []) {
    if (e.category && MAGIC_CATEGORIES.has(e.category)) continue;
    if (typeof e.name === "string" && e.name.startsWith("exception:")) continue;
    if (typeof e.name === "string" && e.name.startsWith("overage:")) continue;

    const recur = parseRecurring(e.recuring_length, e.recurring_time);
    const hasEnd = !!e.end_date;
    const date = e.date || today;

    if (recur && hasEnd) {
      await supabase.from("recurring_rules").insert({
        user_id: userId,
        name: e.name ?? "Recurring",
        amount: Math.abs(e.amount ?? 0),
        is_income: !!e.income,
        category: e.category,
        interval_every: recur.every,
        interval_unit: recur.unit,
        start_date: date,
        end_date: e.end_date,
        counterparty: e.name,
        last_materialized_date: today,
      });
    } else if (e.date) {
      await supabase.from("transactions").insert({
        user_id: userId,
        name: e.name ?? "Expense",
        amount: Math.abs(e.amount ?? 0),
        date: e.date,
        account_id: defaultAccountId,
        counterparty: e.name,
        is_income: !!e.income,
        category: e.category,
      });
    }
  }

  await supabase.from("finance_profiles").upsert({
    user_id: userId,
    onboarded_at: new Date().toISOString(),
    last_expense_prompt_date: null,
  });

  return { migrated: true as const };
}

export function accountBalances(
  accounts: Account[],
  txs: Transaction[]
): Map<number, number> {
  const map = new Map<number, number>();
  for (const a of accounts) {
    map.set(a.id, Number(a.starting_balance) || 0);
  }
  for (const tx of txs) {
    if (!tx.account_id) continue;
    const cur = map.get(tx.account_id) ?? 0;
    const delta = tx.is_income ? Number(tx.amount) : -Number(tx.amount);
    map.set(tx.account_id, cur + delta);
  }
  return map;
}

/** Approximate monthly cashflow from active recurring rules. */
export function monthlyRuleCashflow(rules: RecurringRule[], today = toISODate()) {
  let income = 0;
  let expense = 0;
  for (const r of rules) {
    if (r.end_date && r.end_date < today) continue;
    const amt = Number(r.amount) || 0;
    let perMonth = 0;
    if (r.interval_unit === "months") perMonth = amt / (r.interval_every || 1);
    else if (r.interval_unit === "weeks")
      perMonth = (amt * 52) / 12 / (r.interval_every || 1);
    else if (r.interval_unit === "days")
      perMonth = (amt * 365) / 12 / (r.interval_every || 1);
    else if (r.interval_unit === "years")
      perMonth = amt / 12 / (r.interval_every || 1);
    if (r.is_income) income += perMonth;
    else expense += perMonth;
  }
  return { income, expense, net: income - expense };
}
