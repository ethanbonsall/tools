import { supabase } from "@/lib/supabaseClient";
import type {
  Account,
  FinanceProfile,
  RecurringRule,
  Transaction,
} from "@/lib/finance";
import { materializeRecurring, migrateLegacyFinance, toISODate } from "@/lib/finance";

const FINANCE_PREFIX = "ethans-tools-finance:";
const APP_CACHE_PREFIXES = [FINANCE_PREFIX] as const;

export type FinanceSnapshot = {
  userId: string;
  updatedAt: number;
  profile: FinanceProfile | null;
  accounts: Account[];
  rules: RecurringRule[];
  txs: Transaction[];
  /** YYYY-MM-DD when materialize last ran successfully for this cache. */
  materializedDay?: string | null;
};

function financeKey(userId: string) {
  return `${FINANCE_PREFIX}${userId}`;
}

export function readFinanceCache(userId: string): FinanceSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(financeKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FinanceSnapshot;
    if (!parsed || parsed.userId !== userId) return null;
    return {
      ...parsed,
      accounts: parsed.accounts ?? [],
      rules: parsed.rules ?? [],
      txs: (parsed.txs ?? []).map((t) => ({
        ...t,
        detached: Boolean(t.detached),
      })),
      profile: parsed.profile ?? null,
    };
  } catch {
    return null;
  }
}

export function writeFinanceCache(snap: FinanceSnapshot) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      financeKey(snap.userId),
      JSON.stringify({ ...snap, updatedAt: Date.now() })
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearFinanceCache(userId?: string) {
  if (typeof window === "undefined") return;
  try {
    if (userId) {
      localStorage.removeItem(financeKey(userId));
      return;
    }
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(FINANCE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/** Clear all known app local caches (call on logout). */
export function clearAllAppCaches() {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (APP_CACHE_PREFIXES.some((p) => k.startsWith(p))) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export function emptyFinanceSnapshot(userId: string): FinanceSnapshot {
  return {
    userId,
    updatedAt: 0,
    profile: null,
    accounts: [],
    rules: [],
    txs: [],
    materializedDay: null,
  };
}

/** Fetch finance tables from Supabase (no materialize/migrate). */
export async function fetchFinanceSnapshot(
  userId: string
): Promise<FinanceSnapshot> {
  const [p, a, r, t] = await Promise.all([
    supabase
      .from("finance_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("accounts").select("*").eq("user_id", userId).order("id"),
    supabase
      .from("recurring_rules")
      .select("*")
      .eq("user_id", userId)
      .order("id"),
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(200),
  ]);

  if (p.error) throw p.error;
  if (a.error) throw a.error;
  if (r.error) throw r.error;
  if (t.error) throw t.error;

  return {
    userId,
    updatedAt: Date.now(),
    profile: (p.data as FinanceProfile) ?? null,
    accounts: (a.data ?? []) as Account[],
    rules: (r.data ?? []) as RecurringRule[],
    txs: ((t.data ?? []) as Transaction[]).map((row) => ({
      ...row,
      detached: Boolean(row.detached),
    })),
  };
}

/**
 * Soft sync: migrate/materialize when needed, then fetch and write cache.
 * Returns the fresh snapshot.
 */
export async function syncFinanceFromServer(
  userId: string,
  opts?: { forceMaterialize?: boolean; cached?: FinanceSnapshot | null }
): Promise<FinanceSnapshot> {
  const today = toISODate();
  const cached = opts?.cached ?? readFinanceCache(userId);

  try {
    await migrateLegacyFinance(userId);
  } catch {
    /* legacy tables may be missing */
  }

  const shouldMaterialize =
    opts?.forceMaterialize ||
    !cached?.materializedDay ||
    cached.materializedDay !== today;

  if (shouldMaterialize) {
    await materializeRecurring(userId, today);
  }

  const snap = await fetchFinanceSnapshot(userId);
  snap.materializedDay = shouldMaterialize
    ? today
    : cached?.materializedDay ?? today;
  writeFinanceCache(snap);
  return snap;
}

let tempIdSeq = -1;
export function nextTempId() {
  tempIdSeq -= 1;
  return tempIdSeq;
}

export function patchFinanceCache(
  userId: string,
  patch: Partial<
    Pick<FinanceSnapshot, "profile" | "accounts" | "rules" | "txs" | "materializedDay">
  >
) {
  const prev = readFinanceCache(userId) ?? emptyFinanceSnapshot(userId);
  const next: FinanceSnapshot = {
    ...prev,
    userId,
    updatedAt: Date.now(),
  };
  if ("profile" in patch) next.profile = patch.profile ?? null;
  if (patch.accounts) next.accounts = patch.accounts;
  if (patch.rules) next.rules = patch.rules;
  if (patch.txs) next.txs = patch.txs;
  if ("materializedDay" in patch) next.materializedDay = patch.materializedDay;
  writeFinanceCache(next);
}
