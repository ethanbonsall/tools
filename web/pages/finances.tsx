import Head from "next/head";
import {
  FormEvent,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import AppNav from "@/components/tools/AppNav";
import { useRequireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import {
  Account,
  FinanceProfile,
  RecurringRule,
  Transaction,
  UpcomingEvent,
  accountBalances,
  formatMoney,
  listUpcomingEvents,
  toISODate,
  withProjectedBalances,
} from "@/lib/finance";
import {
  nextTempId,
  patchFinanceCache,
  readFinanceCache,
  syncFinanceFromServer,
  writeFinanceCache,
  type FinanceSnapshot,
} from "@/lib/financeCache";

const inputClass =
  "w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm focus:border-mint/50 focus:outline-none";

type OnboardDraft = {
  bankAccounts: { name: string; balance: string }[];
  debtAccounts: { name: string; balance: string }[];
  recurring: {
    name: string;
    amount: string;
    every: string;
    unit: RecurringRule["interval_unit"];
    counterparty: string;
    isIncome: boolean;
  }[];
  subscriptions: { name: string; amount: string; counterparty: string }[];
};

type AccountDraft = {
  name: string;
  balance: string;
  account_type: Account["account_type"];
};

type RuleDraft = {
  name: string;
  amount: string;
  every: string;
  unit: RecurringRule["interval_unit"];
  counterparty: string;
  is_income: boolean;
  category: string;
  account_id: string;
  start_date: string;
  end_date: string;
};

const emptyOnboard = (): OnboardDraft => ({
  bankAccounts: [{ name: "", balance: "0" }],
  debtAccounts: [{ name: "", balance: "0" }],
  recurring: [
    {
      name: "",
      amount: "",
      every: "1",
      unit: "months",
      counterparty: "",
      isIncome: false,
    },
  ],
  subscriptions: [{ name: "", amount: "", counterparty: "" }],
});

const emptyAccountDraft = (): AccountDraft => ({
  name: "",
  balance: "0",
  account_type: "bank",
});

const emptyRuleDraft = (): RuleDraft => ({
  name: "",
  amount: "",
  every: "1",
  unit: "months",
  counterparty: "",
  is_income: false,
  category: "",
  account_id: "",
  start_date: toISODate(),
  end_date: "",
});

function ruleToDraft(r: RecurringRule): RuleDraft {
  return {
    name: r.name,
    amount: String(r.amount),
    every: String(r.interval_every),
    unit: r.interval_unit,
    counterparty: r.counterparty ?? "",
    is_income: r.is_income,
    category: r.category ?? "",
    account_id: r.account_id != null ? String(r.account_id) : "",
    start_date: r.start_date ?? "",
    end_date: r.end_date ?? "",
  };
}

export default function FinancesPage() {
  const { userId, loading: authLoading } = useRequireAuth();
  const [profile, setProfile] = useState<FinanceProfile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [onboard, setOnboard] = useState<OnboardDraft>(emptyOnboard());
  const [onboardStep, setOnboardStep] = useState(0);
  const [showDaily, setShowDaily] = useState(false);
  const [dailyRows, setDailyRows] = useState([
    {
      amount: "",
      counterparty: "",
      account_id: "",
      is_income: false,
      date: toISODate(),
    },
  ]);

  const [showTxPopup, setShowTxPopup] = useState(false);
  const [editingTxId, setEditingTxId] = useState<number | null>(null);
  const [newTx, setNewTx] = useState({
    name: "",
    amount: "",
    counterparty: "",
    account_id: "",
    is_income: false,
    date: toISODate(),
  });
  const emptyTxForm = () => ({
    name: "",
    amount: "",
    counterparty: "",
    account_id: "",
    is_income: false,
    date: toISODate(),
  });

  const [addingAccount, setAddingAccount] = useState(false);
  const [accountDraft, setAccountDraft] = useState<AccountDraft>(emptyAccountDraft());
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);

  const [addingRule, setAddingRule] = useState(false);
  const [ruleDraft, setRuleDraft] = useState<RuleDraft>(emptyRuleDraft());
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);

  const [showIncome, setShowIncome] = useState(true);
  const [showExpense, setShowExpense] = useState(true);

  /** Edit a single recurring occurrence (one date), not the whole rule. */
  const [occurrenceDraft, setOccurrenceDraft] = useState<{
    rule_id: number;
    /** Original schedule date (for skip when moved). */
    original_date: string;
    date: string;
    name: string;
    amount: string;
    is_income: boolean;
    counterparty: string;
    account_id: string;
    tx_id?: number;
  } | null>(null);

  const applySnapshot = useCallback(
    (snap: FinanceSnapshot, opts?: { promptDaily?: boolean }) => {
      setProfile(snap.profile);
      setAccounts(snap.accounts);
      setRules(snap.rules);
      setTxs(snap.txs);
      writeFinanceCache(snap);

      if (opts?.promptDaily) {
        const day = toISODate();
        const ready =
          Boolean(snap.profile?.onboarded_at) ||
          snap.accounts.length > 0 ||
          snap.rules.length > 0 ||
          snap.txs.length > 0;
        if (ready && snap.profile?.last_expense_prompt_date !== day) {
          setShowDaily(true);
        }
      }
    },
    []
  );

  const persistLocal = useCallback(
    (next: {
      profile?: FinanceProfile | null;
      accounts?: Account[];
      rules?: RecurringRule[];
      txs?: Transaction[];
    }) => {
      if (!userId) return;
      if (next.profile !== undefined) setProfile(next.profile);
      if (next.accounts) setAccounts(next.accounts);
      if (next.rules) setRules(next.rules);
      if (next.txs) setTxs(next.txs);

      const patch: Parameters<typeof patchFinanceCache>[1] = {};
      if (next.profile !== undefined) patch.profile = next.profile;
      if (next.accounts) patch.accounts = next.accounts;
      if (next.rules) patch.rules = next.rules;
      if (next.txs) patch.txs = next.txs;
      patchFinanceCache(userId, patch);
    },
    [userId]
  );

  const load = useCallback(
    async (opts?: { background?: boolean }) => {
      if (!userId) return;
      const background = Boolean(opts?.background);
      const cached = readFinanceCache(userId);

      if (cached && !background) {
        applySnapshot(cached);
        setLoading(false);
      } else if (!cached) {
        setLoading(true);
      }

      setSyncing(true);
      setErr(null);
      try {
        const snap = await syncFinanceFromServer(userId, { cached });
        applySnapshot(snap, { promptDaily: true });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load finances.";
        if (!cached) {
          setErr(
            msg.includes("relation") || msg.includes("schema cache")
              ? "Finance tables are missing. Run supabase/migrations/005_finance_tables.sql then 006_finance_migrate_legacy.sql in the Supabase SQL editor."
              : msg
          );
        }
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [userId, applySnapshot]
  );

  useEffect(() => {
    if (userId) load();
  }, [userId, load]);

  const needsOnboard =
    !profile?.onboarded_at &&
    accounts.length === 0 &&
    rules.length === 0 &&
    txs.length === 0;

  const balanceByAccount = useMemo(
    () => accountBalances(accounts, txs),
    [accounts, txs]
  );

  const netWorth = useMemo(() => {
    let total = 0;
    for (const a of accounts) {
      const bal = balanceByAccount.get(a.id) ?? 0;
      total += a.account_type === "debt" ? -Math.abs(bal) : bal;
    }
    return total;
  }, [accounts, balanceByAccount]);

  const today = toISODate();

  const activeRules = useMemo(
    () => rules.filter((r) => !r.end_date || r.end_date >= today),
    [rules, today]
  );

  const upcoming = useMemo(() => {
    const filtered = listUpcomingEvents(rules, txs, today).filter((ev) => {
      if (ev.is_income && !showIncome) return false;
      if (!ev.is_income && !showExpense) return false;
      return true;
    });
    return withProjectedBalances(filtered, netWorth);
  }, [rules, txs, today, showIncome, showExpense, netWorth]);

  const recentPast = useMemo(
    () => txs.filter((t) => t.date <= today).slice(0, 3),
    [txs, today]
  );

  async function finishOnboard(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setErr(null);
    try {
      for (const b of onboard.bankAccounts) {
        if (!b.name.trim()) continue;
        const { error } = await supabase.from("accounts").insert({
          user_id: userId,
          name: b.name.trim(),
          account_type: "bank",
          starting_balance: Number(b.balance) || 0,
        });
        if (error) throw error;
      }
      for (const d of onboard.debtAccounts) {
        if (!d.name.trim()) continue;
        const { error } = await supabase.from("accounts").insert({
          user_id: userId,
          name: d.name.trim(),
          account_type: "debt",
          starting_balance: Number(d.balance) || 0,
        });
        if (error) throw error;
      }
      for (const r of onboard.recurring) {
        if (!r.name.trim() || !r.amount) continue;
        const { error } = await supabase.from("recurring_rules").insert({
          user_id: userId,
          name: r.name.trim(),
          amount: Number(r.amount),
          is_income: r.isIncome,
          category: "recurring",
          interval_every: Number(r.every) || 1,
          interval_unit: r.unit,
          start_date: toISODate(),
          counterparty: r.counterparty.trim() || r.name.trim(),
          last_materialized_date: null,
        });
        if (error) throw error;
      }
      for (const s of onboard.subscriptions) {
        if (!s.name.trim() || !s.amount) continue;
        const { error } = await supabase.from("recurring_rules").insert({
          user_id: userId,
          name: s.name.trim(),
          amount: Number(s.amount),
          is_income: false,
          category: "subscription",
          interval_every: 1,
          interval_unit: "months",
          start_date: toISODate(),
          counterparty: s.counterparty.trim() || s.name.trim(),
          last_materialized_date: null,
        });
        if (error) throw error;
      }

      const { error: profileErr } = await supabase.from("finance_profiles").upsert({
        user_id: userId,
        onboarded_at: new Date().toISOString(),
        last_expense_prompt_date: null,
      });
      if (profileErr) throw profileErr;

      await load();
      setShowDaily(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Onboarding failed.");
    }
  }

  async function saveDaily(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const prevTxs = txs;
    const prevProfile = profile;
    const day = toISODate();
    const newRows: Transaction[] = [];

    for (const row of dailyRows) {
      if (!row.amount || !row.counterparty.trim()) continue;
      newRows.push({
        id: nextTempId(),
        created_at: new Date().toISOString(),
        user_id: userId,
        name: row.counterparty.trim(),
        amount: Number(row.amount),
        date: row.date || day,
        account_id: row.account_id ? Number(row.account_id) : null,
        counterparty: row.counterparty.trim(),
        is_income: row.is_income,
        recurring_rule_id: null,
        category: "manual",
        detached: false,
      });
    }

    const nextProfile: FinanceProfile = {
      user_id: userId,
      onboarded_at: profile?.onboarded_at ?? new Date().toISOString(),
      last_expense_prompt_date: day,
    };
    persistLocal({
      txs: [...newRows, ...txs],
      profile: nextProfile,
    });
    setShowDaily(false);

    try {
      let working = [...newRows, ...txs];
      for (const row of newRows) {
        const { data, error } = await supabase
          .from("transactions")
          .insert({
            user_id: userId,
            name: row.name,
            amount: row.amount,
            date: row.date,
            account_id: row.account_id,
            counterparty: row.counterparty,
            is_income: row.is_income,
            category: "manual",
          })
          .select("*")
          .single();
        if (error) throw error;
        working = working.map((t) =>
          t.id === row.id ? (data as Transaction) : t
        );
        persistLocal({ txs: working });
      }
      await supabase.from("finance_profiles").upsert(nextProfile);
    } catch (e: unknown) {
      persistLocal({ txs: prevTxs, profile: prevProfile });
      setShowDaily(true);
      setErr(e instanceof Error ? e.message : "Failed to save expenses.");
    }
  }

  async function skipDaily() {
    if (!userId) return;
    const prevProfile = profile;
    const nextProfile: FinanceProfile = {
      user_id: userId,
      onboarded_at: profile?.onboarded_at ?? new Date().toISOString(),
      last_expense_prompt_date: toISODate(),
    };
    persistLocal({ profile: nextProfile });
    setShowDaily(false);

    const { error } = await supabase.from("finance_profiles").upsert(nextProfile);
    if (error) {
      persistLocal({ profile: prevProfile });
      setErr(error.message);
    }
  }

  function startEditAccount(a: Account) {
    setAddingAccount(false);
    setEditingAccountId(a.id);
    setAccountDraft({
      name: a.name,
      balance: String(balanceByAccount.get(a.id) ?? a.starting_balance),
      account_type: a.account_type,
    });
  }

  function startAddAccount() {
    setEditingAccountId(null);
    setAccountDraft(emptyAccountDraft());
    setAddingAccount(true);
  }

  function cancelAccountEdit() {
    setAddingAccount(false);
    setEditingAccountId(null);
    setAccountDraft(emptyAccountDraft());
  }

  async function saveAccountEdit() {
    if (!userId || !accountDraft.name.trim()) return;
    const prevAccounts = accounts;

    if (addingAccount) {
      const temp: Account = {
        id: nextTempId(),
        created_at: new Date().toISOString(),
        user_id: userId,
        name: accountDraft.name.trim(),
        account_type: accountDraft.account_type,
        starting_balance: Number(accountDraft.balance) || 0,
      };
      const optimistic = [...accounts, temp];
      persistLocal({ accounts: optimistic });
      cancelAccountEdit();

      const { data, error } = await supabase
        .from("accounts")
        .insert({
          user_id: userId,
          name: temp.name,
          account_type: temp.account_type,
          starting_balance: temp.starting_balance,
        })
        .select("*")
        .single();
      if (error) {
        persistLocal({ accounts: prevAccounts });
        setErr(error.message);
        return;
      }
      persistLocal({
        accounts: optimistic.map((a) =>
          a.id === temp.id ? (data as Account) : a
        ),
      });
      return;
    }

    if (editingAccountId != null) {
      const existing = accounts.find((a) => a.id === editingAccountId);
      if (!existing) return;
      const displayed =
        balanceByAccount.get(existing.id) ?? Number(existing.starting_balance);
      const txNet = displayed - Number(existing.starting_balance);
      const desired = Number(accountDraft.balance) || 0;
      const starting_balance = desired - txNet;
      const updated: Account = {
        ...existing,
        name: accountDraft.name.trim(),
        account_type: accountDraft.account_type,
        starting_balance,
      };
      persistLocal({
        accounts: accounts.map((a) => (a.id === existing.id ? updated : a)),
      });
      cancelAccountEdit();

      const { error } = await supabase
        .from("accounts")
        .update({
          name: updated.name,
          account_type: updated.account_type,
          starting_balance,
        })
        .eq("id", editingAccountId);
      if (error) {
        persistLocal({ accounts: prevAccounts });
        setErr(error.message);
      }
    }
  }

  function startEditRule(r: RecurringRule) {
    setAddingRule(false);
    setEditingRuleId(r.id);
    setRuleDraft(ruleToDraft(r));
  }

  function startAddRule() {
    setEditingRuleId(null);
    setRuleDraft(emptyRuleDraft());
    setAddingRule(true);
  }

  function cancelRuleEdit() {
    setAddingRule(false);
    setEditingRuleId(null);
    setRuleDraft(emptyRuleDraft());
  }

  async function saveRuleEdit() {
    if (!userId || !ruleDraft.name.trim() || !ruleDraft.amount) return;
    const prevRules = rules;

    const payload = {
      user_id: userId,
      name: ruleDraft.name.trim(),
      amount: Number(ruleDraft.amount),
      is_income: ruleDraft.is_income,
      category: ruleDraft.category.trim() || null,
      interval_every: Number(ruleDraft.every) || 1,
      interval_unit: ruleDraft.unit,
      account_id: ruleDraft.account_id ? Number(ruleDraft.account_id) : null,
      counterparty: ruleDraft.counterparty.trim() || ruleDraft.name.trim(),
      start_date: ruleDraft.start_date || toISODate(),
      end_date: ruleDraft.end_date || null,
    };

    if (addingRule) {
      const temp: RecurringRule = {
        id: nextTempId(),
        created_at: new Date().toISOString(),
        ...payload,
        last_materialized_date: null,
        skip_dates: [],
      };
      const optimistic = [...rules, temp];
      persistLocal({ rules: optimistic });
      cancelRuleEdit();

      const { data, error } = await supabase
        .from("recurring_rules")
        .insert({
          ...payload,
          last_materialized_date: null,
        })
        .select("*")
        .single();
      if (error) {
        persistLocal({ rules: prevRules });
        setErr(error.message);
        return;
      }
      persistLocal({
        rules: optimistic.map((r) =>
          r.id === temp.id ? (data as RecurringRule) : r
        ),
      });
      return;
    }

    if (editingRuleId != null) {
      const existing = rules.find((r) => r.id === editingRuleId);
      if (!existing) return;
      const updated: RecurringRule = { ...existing, ...payload };
      persistLocal({
        rules: rules.map((r) => (r.id === existing.id ? updated : r)),
      });
      cancelRuleEdit();

      const { error } = await supabase
        .from("recurring_rules")
        .update(payload)
        .eq("id", editingRuleId);
      if (error) {
        persistLocal({ rules: prevRules });
        setErr(error.message);
      }
    }
  }

  async function deleteRule(id: number) {
    if (!userId) return;
    const prevRules = rules;
    const prevTxs = txs;
    if (editingRuleId === id) cancelRuleEdit();
    persistLocal({
      rules: rules.filter((r) => r.id !== id),
      txs: txs.filter((t) => t.recurring_rule_id !== id),
    });

    // Cascade deletes linked transactions in DB; explicit delete for clarity
    await supabase.from("transactions").delete().eq("recurring_rule_id", id);
    const { error } = await supabase.from("recurring_rules").delete().eq("id", id);
    if (error) {
      persistLocal({ rules: prevRules, txs: prevTxs });
      setErr(error.message);
    }
  }

  function openNewTransaction() {
    setEditingTxId(null);
    setNewTx(emptyTxForm());
    setShowTxPopup(true);
  }

  function openEditTransaction(tx: Transaction) {
    setEditingTxId(tx.id);
    setNewTx({
      name: tx.name,
      amount: String(tx.amount),
      counterparty: tx.counterparty ?? "",
      account_id: tx.account_id != null ? String(tx.account_id) : "",
      is_income: tx.is_income,
      date: tx.date,
    });
    setShowTxPopup(true);
  }

  function closeTxPopup() {
    setShowTxPopup(false);
    setEditingTxId(null);
    setNewTx(emptyTxForm());
  }

  async function saveTransaction(e: FormEvent) {
    e.preventDefault();
    if (!userId || !newTx.amount) return;
    const prevTxs = txs;
    const base = {
      user_id: userId,
      name: newTx.name.trim() || newTx.counterparty.trim() || "Transaction",
      amount: Number(newTx.amount),
      date: newTx.date,
      account_id: newTx.account_id ? Number(newTx.account_id) : null,
      counterparty: newTx.counterparty.trim() || null,
      is_income: newTx.is_income,
    };

    if (editingTxId != null) {
      const existing = txs.find((t) => t.id === editingTxId);
      if (!existing) return;
      const updated: Transaction = { ...existing, ...base };
      persistLocal({
        txs: txs.map((t) => (t.id === existing.id ? updated : t)),
      });
      closeTxPopup();

      const { error } = await supabase
        .from("transactions")
        .update(base)
        .eq("id", editingTxId);
      if (error) {
        persistLocal({ txs: prevTxs });
        setErr(error.message);
      }
      return;
    }

    const temp: Transaction = {
      id: nextTempId(),
      created_at: new Date().toISOString(),
      ...base,
      recurring_rule_id: null,
      category: "manual",
      detached: false,
    };
    const optimistic = [temp, ...txs];
    persistLocal({ txs: optimistic });
    closeTxPopup();

    const { data, error } = await supabase
      .from("transactions")
      .insert({ ...base, category: "manual" })
      .select("*")
      .single();
    if (error) {
      persistLocal({ txs: prevTxs });
      setErr(error.message);
      return;
    }
    persistLocal({
      txs: optimistic.map((t) => (t.id === temp.id ? (data as Transaction) : t)),
    });
  }

  async function deleteTransaction(id: number) {
    if (!userId) return;
    const prevTxs = txs;
    if (editingTxId === id) closeTxPopup();
    persistLocal({ txs: txs.filter((t) => t.id !== id) });

    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) {
      persistLocal({ txs: prevTxs });
      setErr(error.message);
    }
  }

  function openOccurrenceEdit(ev: UpcomingEvent) {
    if (ev.rule_id == null) return;
    const rule = rules.find((r) => r.id === ev.rule_id);
    setOccurrenceDraft({
      rule_id: ev.rule_id,
      original_date: ev.date,
      date: ev.date,
      name: ev.name,
      amount: String(ev.amount),
      is_income: ev.is_income,
      counterparty: ev.counterparty ?? "",
      account_id: rule?.account_id != null ? String(rule.account_id) : "",
      tx_id: ev.tx_id,
    });
  }

  async function saveOccurrenceEdit(e: FormEvent) {
    e.preventDefault();
    if (!userId || !occurrenceDraft || !occurrenceDraft.amount) return;
    const rule = rules.find((r) => r.id === occurrenceDraft.rule_id);
    if (!rule) return;
    const prevTxs = txs;
    const prevRules = rules;
    const dateMoved = occurrenceDraft.date !== occurrenceDraft.original_date;

    const payload = {
      user_id: userId,
      name: occurrenceDraft.name.trim() || rule.name,
      amount: Number(occurrenceDraft.amount),
      date: occurrenceDraft.date,
      account_id: occurrenceDraft.account_id
        ? Number(occurrenceDraft.account_id)
        : rule.account_id,
      counterparty: occurrenceDraft.counterparty.trim() || rule.counterparty,
      is_income: occurrenceDraft.is_income,
      recurring_rule_id: rule.id,
      category: rule.category,
      detached: true,
    };

    let nextSkips = [...(rule.skip_dates ?? []).map((d) => d.slice(0, 10))];
    if (dateMoved) {
      nextSkips = Array.from(new Set([...nextSkips, occurrenceDraft.original_date]));
    }

    if (occurrenceDraft.tx_id != null) {
      const existing = txs.find((t) => t.id === occurrenceDraft.tx_id);
      if (!existing) return;
      const updated: Transaction = { ...existing, ...payload };
      persistLocal({
        txs: txs.map((t) => (t.id === existing.id ? updated : t)),
        rules: dateMoved
          ? rules.map((r) =>
              r.id === rule.id ? { ...r, skip_dates: nextSkips } : r
            )
          : undefined,
      });
      setOccurrenceDraft(null);

      const { error } = await supabase
        .from("transactions")
        .update(payload)
        .eq("id", occurrenceDraft.tx_id);
      if (error) {
        persistLocal({ txs: prevTxs, rules: prevRules });
        setErr(error.message);
        return;
      }
      if (dateMoved) {
        const { error: skipErr } = await supabase
          .from("recurring_rules")
          .update({ skip_dates: nextSkips })
          .eq("id", rule.id);
        if (skipErr) {
          persistLocal({ txs: prevTxs, rules: prevRules });
          setErr(skipErr.message);
        }
      }
      return;
    }

    const temp: Transaction = {
      id: nextTempId(),
      created_at: new Date().toISOString(),
      ...payload,
    };
    const optimistic = [temp, ...txs];
    persistLocal({
      txs: optimistic,
      rules: dateMoved
        ? rules.map((r) =>
            r.id === rule.id ? { ...r, skip_dates: nextSkips } : r
          )
        : undefined,
    });
    setOccurrenceDraft(null);

    const { data, error } = await supabase
      .from("transactions")
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      persistLocal({ txs: prevTxs, rules: prevRules });
      setErr(error.message);
      return;
    }
    persistLocal({
      txs: optimistic.map((t) => (t.id === temp.id ? (data as Transaction) : t)),
    });
    if (dateMoved) {
      const { error: skipErr } = await supabase
        .from("recurring_rules")
        .update({ skip_dates: nextSkips })
        .eq("id", rule.id);
      if (skipErr) {
        persistLocal({ rules: prevRules });
        setErr(skipErr.message);
      }
    }
  }

  async function deleteOccurrence(ev: UpcomingEvent) {
    if (!userId || ev.rule_id == null) return;
    const rule = rules.find((r) => r.id === ev.rule_id);
    if (!rule) return;
    const prevRules = rules;
    const prevTxs = txs;

    const nextSkips = Array.from(
      new Set([...(rule.skip_dates ?? []).map((d) => d.slice(0, 10)), ev.date])
    );
    const nextRules = rules.map((r) =>
      r.id === rule.id ? { ...r, skip_dates: nextSkips } : r
    );
    const nextTxs =
      ev.tx_id != null ? txs.filter((t) => t.id !== ev.tx_id) : txs;

    persistLocal({ rules: nextRules, txs: nextTxs });
    setOccurrenceDraft(null);

    if (ev.tx_id != null) {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", ev.tx_id);
      if (error) {
        persistLocal({ rules: prevRules, txs: prevTxs });
        setErr(error.message);
        return;
      }
    }

    const { error } = await supabase
      .from("recurring_rules")
      .update({ skip_dates: nextSkips })
      .eq("id", rule.id);
    if (error) {
      persistLocal({ rules: prevRules, txs: prevTxs });
      setErr(error.message);
    }
  }

  function renderAccountEditor() {
    return (
      <div className="relative flex min-h-[7.5rem] flex-col rounded-2xl border border-mint/40 bg-surface p-4 ring-1 ring-mint/20">
        <div className="absolute right-2 top-2 flex gap-1">
          <button
            type="button"
            aria-label="Cancel"
            onClick={cancelAccountEdit}
            className="rounded-full p-1 text-muted hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Save account"
            onClick={saveAccountEdit}
            className="rounded-full bg-mint p-1 text-paper"
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
        <select
          value={accountDraft.account_type}
          onChange={(e) =>
            setAccountDraft({
              ...accountDraft,
              account_type: e.target.value as Account["account_type"],
            })
          }
          className="w-fit max-w-[70%] bg-transparent text-xs uppercase tracking-wide text-muted outline-none"
        >
          <option value="bank">Bank</option>
          <option value="debt">Debt</option>
        </select>
        <input
          autoFocus
          placeholder="Name"
          value={accountDraft.name}
          onChange={(e) =>
            setAccountDraft({ ...accountDraft, name: e.target.value })
          }
          className="mt-1 w-full bg-transparent font-semibold outline-none placeholder:text-muted"
        />
        <input
          placeholder="0.00"
          type="number"
          step="0.01"
          value={accountDraft.balance}
          onChange={(e) =>
            setAccountDraft({ ...accountDraft, balance: e.target.value })
          }
          className="mt-2 w-full bg-transparent font-display text-2xl text-mint outline-none"
        />
      </div>
    );
  }

  function renderRuleEditor() {
    const field =
      "min-w-0 rounded-lg border border-line bg-paper px-2 py-1 text-sm focus:border-mint/50 focus:outline-none";
    return (
      <li className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            autoFocus
            placeholder="Name"
            value={ruleDraft.name}
            onChange={(e) => setRuleDraft({ ...ruleDraft, name: e.target.value })}
            className={`${field} w-28 flex-1 font-medium`}
          />
          <input
            placeholder="0.00"
            type="number"
            step="0.01"
            value={ruleDraft.amount}
            onChange={(e) =>
              setRuleDraft({ ...ruleDraft, amount: e.target.value })
            }
            className={`${field} w-20`}
          />
          <input
            placeholder="Label"
            value={ruleDraft.category}
            onChange={(e) =>
              setRuleDraft({ ...ruleDraft, category: e.target.value })
            }
            className={`${field} w-24`}
          />
          <span className="text-xs text-muted">every</span>
          <input
            type="number"
            value={ruleDraft.every}
            onChange={(e) =>
              setRuleDraft({ ...ruleDraft, every: e.target.value })
            }
            className={`${field} w-12`}
          />
          <select
            value={ruleDraft.unit}
            onChange={(e) =>
              setRuleDraft({
                ...ruleDraft,
                unit: e.target.value as RecurringRule["interval_unit"],
              })
            }
            className={field}
          >
            <option value="days">days</option>
            <option value="weeks">weeks</option>
            <option value="months">months</option>
            <option value="years">years</option>
          </select>
          <input
            type="date"
            title="Start date"
            value={ruleDraft.start_date}
            onChange={(e) =>
              setRuleDraft({ ...ruleDraft, start_date: e.target.value })
            }
            className={`${field} w-[9.5rem] ${!ruleDraft.start_date ? "text-muted" : ""}`}
          />
          <input
            type="date"
            title="End date (optional)"
            value={ruleDraft.end_date}
            onChange={(e) =>
              setRuleDraft({ ...ruleDraft, end_date: e.target.value })
            }
            className={`${field} w-[9.5rem] ${!ruleDraft.end_date ? "text-muted" : ""}`}
          />
          <label className="flex items-center gap-1 text-xs text-muted">
            <input
              type="checkbox"
              checked={ruleDraft.is_income}
              onChange={(e) =>
                setRuleDraft({ ...ruleDraft, is_income: e.target.checked })
              }
            />
            In
          </label>
          <button
            type="button"
            aria-label="Cancel"
            onClick={cancelRuleEdit}
            className="rounded-full p-1 text-muted hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Save rule"
            onClick={saveRuleEdit}
            className="rounded-full bg-mint p-1 text-paper"
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
      </li>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="dashboard-shell flex min-h-screen items-center justify-center text-muted">
        …
      </div>
    );
  }

  return (
    <div className="dashboard-shell pb-24 text-ink md:pb-10">
      <Head>
        <title>Finances · Ethan&apos;s Tools</title>
      </Head>
      <AppNav />

      {showDaily && !needsOnboard ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <form
            onSubmit={saveDaily}
            className="relative z-10 w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-xl"
          >
            <h2 className="font-display text-xl font-bold">Add recent expenses</h2>
            <p className="mt-1 text-sm text-muted">
              What came in or went out? Note the source or destination.
            </p>
            <div className="mt-4 space-y-3">
              {dailyRows.map((row, i) => (
                <div
                  key={i}
                  className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-2"
                >
                  <input
                    placeholder="Amount"
                    type="number"
                    step="0.01"
                    value={row.amount}
                    onChange={(e) => {
                      const next = [...dailyRows];
                      next[i] = { ...row, amount: e.target.value };
                      setDailyRows(next);
                    }}
                    className={inputClass}
                  />
                  <input
                    placeholder="From / to (e.g. paycheck, McDonald's)"
                    value={row.counterparty}
                    onChange={(e) => {
                      const next = [...dailyRows];
                      next[i] = { ...row, counterparty: e.target.value };
                      setDailyRows(next);
                    }}
                    className={inputClass}
                  />
                  <select
                    value={row.account_id}
                    onChange={(e) => {
                      const next = [...dailyRows];
                      next[i] = { ...row, account_id: e.target.value };
                      setDailyRows(next);
                    }}
                    className={inputClass}
                  >
                    <option value="">Account (optional)</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={row.is_income}
                      onChange={(e) => {
                        const next = [...dailyRows];
                        next[i] = { ...row, is_income: e.target.checked };
                        setDailyRows(next);
                      }}
                    />
                    Income
                  </label>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-3 text-sm text-mint hover:underline"
              onClick={() =>
                setDailyRows((r) => [
                  ...r,
                  {
                    amount: "",
                    counterparty: "",
                    account_id: "",
                    is_income: false,
                    date: toISODate(),
                  },
                ])
              }
            >
              + Another
            </button>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={skipDaily}
                className="rounded-full border border-line px-4 py-2 text-sm"
              >
                Skip today
              </button>
              <button
                type="submit"
                className="rounded-full bg-mint px-4 py-2 text-sm font-semibold text-paper"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {showTxPopup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Close"
            onClick={closeTxPopup}
          />
          <form
            onSubmit={saveTransaction}
            className="relative z-10 w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-display text-xl font-bold">
                {editingTxId != null ? "Edit transaction" : "Add transaction"}
              </h2>
              <button
                type="button"
                onClick={closeTxPopup}
                className="rounded-full p-1 text-muted hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 grid gap-2">
              <input
                placeholder="Name"
                value={newTx.name}
                onChange={(e) => setNewTx({ ...newTx, name: e.target.value })}
                className={inputClass}
              />
              <input
                placeholder="Amount"
                type="number"
                step="0.01"
                required
                value={newTx.amount}
                onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                className={inputClass}
              />
              <input
                placeholder="From / to"
                value={newTx.counterparty}
                onChange={(e) =>
                  setNewTx({ ...newTx, counterparty: e.target.value })
                }
                className={inputClass}
              />
              <select
                value={newTx.account_id}
                onChange={(e) =>
                  setNewTx({ ...newTx, account_id: e.target.value })
                }
                className={inputClass}
              >
                <option value="">Account (optional)</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={newTx.date}
                onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                className={inputClass}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newTx.is_income}
                  onChange={(e) =>
                    setNewTx({ ...newTx, is_income: e.target.checked })
                  }
                />
                Income
              </label>
            </div>
            <div className="mt-5 flex gap-2">
              {editingTxId != null ? (
                <button
                  type="button"
                  onClick={() => deleteTransaction(editingTxId)}
                  className="rounded-full border border-line px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/10"
                >
                  Delete
                </button>
              ) : null}
              <button
                type="submit"
                className="flex-1 rounded-full bg-mint py-2.5 text-sm font-semibold text-paper"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {occurrenceDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Close"
            onClick={() => setOccurrenceDraft(null)}
          />
          <form
            onSubmit={saveOccurrenceEdit}
            className="relative z-10 w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-xl font-bold">
                  Edit this occurrence
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Detaches from the rule — later rule edits won&apos;t change it.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOccurrenceDraft(null)}
                className="rounded-full p-1 text-muted hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 grid gap-2">
              <input
                type="date"
                required
                value={occurrenceDraft.date}
                onChange={(e) =>
                  setOccurrenceDraft({
                    ...occurrenceDraft,
                    date: e.target.value,
                  })
                }
                className={inputClass}
              />
              <input
                placeholder="Name"
                value={occurrenceDraft.name}
                onChange={(e) =>
                  setOccurrenceDraft({
                    ...occurrenceDraft,
                    name: e.target.value,
                  })
                }
                className={inputClass}
              />
              <input
                placeholder="Amount"
                type="number"
                step="0.01"
                required
                value={occurrenceDraft.amount}
                onChange={(e) =>
                  setOccurrenceDraft({
                    ...occurrenceDraft,
                    amount: e.target.value,
                  })
                }
                className={inputClass}
              />
              <input
                placeholder="From / to"
                value={occurrenceDraft.counterparty}
                onChange={(e) =>
                  setOccurrenceDraft({
                    ...occurrenceDraft,
                    counterparty: e.target.value,
                  })
                }
                className={inputClass}
              />
              <select
                value={occurrenceDraft.account_id}
                onChange={(e) =>
                  setOccurrenceDraft({
                    ...occurrenceDraft,
                    account_id: e.target.value,
                  })
                }
                className={inputClass}
              >
                <option value="">Account (optional)</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={occurrenceDraft.is_income}
                  onChange={(e) =>
                    setOccurrenceDraft({
                      ...occurrenceDraft,
                      is_income: e.target.checked,
                    })
                  }
                />
                Income
              </label>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() =>
                  deleteOccurrence({
                    key: "",
                    date: occurrenceDraft.original_date,
                    name: occurrenceDraft.name,
                    amount: Number(occurrenceDraft.amount) || 0,
                    is_income: occurrenceDraft.is_income,
                    counterparty: occurrenceDraft.counterparty,
                    source: "recurring",
                    rule_id: occurrenceDraft.rule_id,
                    tx_id: occurrenceDraft.tx_id,
                  })
                }
                className="rounded-full border border-line px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/10"
              >
                Skip this date
              </button>
              <button
                type="submit"
                className="flex-1 rounded-full bg-mint py-2.5 text-sm font-semibold text-paper"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <main className="mx-auto max-w-5xl px-4 py-8">
        {syncing ? (
          <div className="mb-3 text-xs text-muted">Syncing…</div>
        ) : null}
        {err ? (
          <div className="mb-4 rounded-xl border border-amber-200/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {err}
          </div>
        ) : null}

        {needsOnboard ? (
          <form onSubmit={finishOnboard} className="mx-auto max-w-xl space-y-6">
            <h1 className="font-display text-3xl font-bold">Set up finances</h1>
            <p className="text-muted">
              Step {onboardStep + 1} of 4 — accounts and recurring cashflow.
            </p>

            {onboardStep === 0 ? (
              <section className="space-y-3">
                <h2 className="font-semibold">Bank accounts</h2>
                {onboard.bankAccounts.map((b, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      placeholder="Name"
                      value={b.name}
                      onChange={(e) => {
                        const next = [...onboard.bankAccounts];
                        next[i] = { ...b, name: e.target.value };
                        setOnboard({ ...onboard, bankAccounts: next });
                      }}
                      className={`flex-1 ${inputClass}`}
                    />
                    <input
                      placeholder="Balance"
                      type="number"
                      value={b.balance}
                      onChange={(e) => {
                        const next = [...onboard.bankAccounts];
                        next[i] = { ...b, balance: e.target.value };
                        setOnboard({ ...onboard, bankAccounts: next });
                      }}
                      className={`w-28 ${inputClass}`}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="text-sm text-mint"
                  onClick={() =>
                    setOnboard({
                      ...onboard,
                      bankAccounts: [
                        ...onboard.bankAccounts,
                        { name: "", balance: "0" },
                      ],
                    })
                  }
                >
                  + Add bank
                </button>
              </section>
            ) : null}

            {onboardStep === 1 ? (
              <section className="space-y-3">
                <h2 className="font-semibold">Debt accounts</h2>
                {onboard.debtAccounts.map((b, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      placeholder="Name"
                      value={b.name}
                      onChange={(e) => {
                        const next = [...onboard.debtAccounts];
                        next[i] = { ...b, name: e.target.value };
                        setOnboard({ ...onboard, debtAccounts: next });
                      }}
                      className={`flex-1 ${inputClass}`}
                    />
                    <input
                      placeholder="Balance"
                      type="number"
                      value={b.balance}
                      onChange={(e) => {
                        const next = [...onboard.debtAccounts];
                        next[i] = { ...b, balance: e.target.value };
                        setOnboard({ ...onboard, debtAccounts: next });
                      }}
                      className={`w-28 ${inputClass}`}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="text-sm text-mint"
                  onClick={() =>
                    setOnboard({
                      ...onboard,
                      debtAccounts: [
                        ...onboard.debtAccounts,
                        { name: "", balance: "0" },
                      ],
                    })
                  }
                >
                  + Add debt
                </button>
              </section>
            ) : null}

            {onboardStep === 2 ? (
              <section className="space-y-3">
                <h2 className="font-semibold">Recurring expenses / income</h2>
                {onboard.recurring.map((r, i) => (
                  <div key={i} className="space-y-2 rounded-xl border border-line p-3">
                    <input
                      placeholder="Name"
                      value={r.name}
                      onChange={(e) => {
                        const next = [...onboard.recurring];
                        next[i] = { ...r, name: e.target.value };
                        setOnboard({ ...onboard, recurring: next });
                      }}
                      className={inputClass}
                    />
                    <div className="flex flex-wrap gap-2">
                      <input
                        placeholder="Amount"
                        type="number"
                        value={r.amount}
                        onChange={(e) => {
                          const next = [...onboard.recurring];
                          next[i] = { ...r, amount: e.target.value };
                          setOnboard({ ...onboard, recurring: next });
                        }}
                        className={`w-28 ${inputClass}`}
                      />
                      <input
                        placeholder="Every"
                        type="number"
                        value={r.every}
                        onChange={(e) => {
                          const next = [...onboard.recurring];
                          next[i] = { ...r, every: e.target.value };
                          setOnboard({ ...onboard, recurring: next });
                        }}
                        className={`w-20 ${inputClass}`}
                      />
                      <select
                        value={r.unit}
                        onChange={(e) => {
                          const next = [...onboard.recurring];
                          next[i] = {
                            ...r,
                            unit: e.target.value as RecurringRule["interval_unit"],
                          };
                          setOnboard({ ...onboard, recurring: next });
                        }}
                        className={inputClass}
                      >
                        <option value="days">days</option>
                        <option value="weeks">weeks</option>
                        <option value="months">months</option>
                        <option value="years">years</option>
                      </select>
                      <input
                        placeholder="Source / destination"
                        value={r.counterparty}
                        onChange={(e) => {
                          const next = [...onboard.recurring];
                          next[i] = { ...r, counterparty: e.target.value };
                          setOnboard({ ...onboard, recurring: next });
                        }}
                        className={`min-w-[10rem] flex-1 ${inputClass}`}
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={r.isIncome}
                          onChange={(e) => {
                            const next = [...onboard.recurring];
                            next[i] = { ...r, isIncome: e.target.checked };
                            setOnboard({ ...onboard, recurring: next });
                          }}
                        />
                        Income
                      </label>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-sm text-mint"
                  onClick={() =>
                    setOnboard({
                      ...onboard,
                      recurring: [
                        ...onboard.recurring,
                        {
                          name: "",
                          amount: "",
                          every: "1",
                          unit: "months",
                          counterparty: "",
                          isIncome: false,
                        },
                      ],
                    })
                  }
                >
                  + Add recurring
                </button>
              </section>
            ) : null}

            {onboardStep === 3 ? (
              <section className="space-y-3">
                <h2 className="font-semibold">Subscriptions</h2>
                {onboard.subscriptions.map((s, i) => (
                  <div key={i} className="flex flex-wrap gap-2">
                    <input
                      placeholder="Name"
                      value={s.name}
                      onChange={(e) => {
                        const next = [...onboard.subscriptions];
                        next[i] = { ...s, name: e.target.value };
                        setOnboard({ ...onboard, subscriptions: next });
                      }}
                      className={`min-w-[8rem] flex-1 ${inputClass}`}
                    />
                    <input
                      placeholder="Amount"
                      type="number"
                      value={s.amount}
                      onChange={(e) => {
                        const next = [...onboard.subscriptions];
                        next[i] = { ...s, amount: e.target.value };
                        setOnboard({ ...onboard, subscriptions: next });
                      }}
                      className={`w-28 ${inputClass}`}
                    />
                    <input
                      placeholder="Provider"
                      value={s.counterparty}
                      onChange={(e) => {
                        const next = [...onboard.subscriptions];
                        next[i] = { ...s, counterparty: e.target.value };
                        setOnboard({ ...onboard, subscriptions: next });
                      }}
                      className={`min-w-[8rem] flex-1 ${inputClass}`}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="text-sm text-mint"
                  onClick={() =>
                    setOnboard({
                      ...onboard,
                      subscriptions: [
                        ...onboard.subscriptions,
                        { name: "", amount: "", counterparty: "" },
                      ],
                    })
                  }
                >
                  + Add subscription
                </button>
              </section>
            ) : null}

            <div className="flex justify-between pt-4">
              <button
                type="button"
                disabled={onboardStep === 0}
                onClick={() => setOnboardStep((s) => s - 1)}
                className="rounded-full border border-line px-4 py-2 text-sm disabled:opacity-40"
              >
                Back
              </button>
              {onboardStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setOnboardStep((s) => s + 1)}
                  className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  className="rounded-full bg-mint px-4 py-2 text-sm font-semibold text-paper"
                >
                  Finish setup
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="space-y-10">
            {/* Accounts */}
            <section>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold">Accounts</h2>
                <button
                  type="button"
                  aria-label="Add account"
                  onClick={startAddAccount}
                  className="rounded-full border border-line p-1.5 text-mint hover:bg-mint/10"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {accounts.map((a) =>
                  editingAccountId === a.id ? (
                    <div key={a.id}>{renderAccountEditor()}</div>
                  ) : (
                    <button
                      type="button"
                      key={a.id}
                      onClick={() => startEditAccount(a)}
                      className="flex min-h-[7.5rem] flex-col rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-mint/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs uppercase tracking-wide text-muted">
                          {a.account_type}
                        </div>
                        <Pencil className="h-3.5 w-3.5 text-muted" />
                      </div>
                      <div className="mt-1 font-semibold">{a.name}</div>
                      <div className="mt-auto pt-2 font-display text-2xl text-mint">
                        {formatMoney(balanceByAccount.get(a.id) ?? 0)}
                      </div>
                    </button>
                  )
                )}
                {addingAccount ? renderAccountEditor() : null}
                {accounts.length === 0 && !addingAccount ? (
                  <p className="text-sm text-muted">No accounts yet.</p>
                ) : null}
              </div>
            </section>

            {/* Upcoming */}
            <section>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">
                  Upcoming
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowIncome((v) => !v)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      showIncome
                        ? "bg-mint/35 text-mint ring-1 ring-mint/60"
                        : "border border-line text-muted"
                    }`}
                  >
                    Income
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowExpense((v) => !v)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      showExpense
                        ? "bg-mint/35 text-mint ring-1 ring-mint/60"
                        : "border border-line text-muted"
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={openNewTransaction}
                    className="inline-flex items-center gap-1 rounded-full bg-mint px-3 py-1.5 text-xs font-semibold text-paper"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Transaction
                  </button>
                </div>
              </div>
              <div
                className="mt-3 overflow-y-auto rounded-2xl border border-line bg-surface"
                style={{ maxHeight: "calc(5 * 4.25rem)" }}
              >
                <ul className="divide-y divide-line">
                  {upcoming.length === 0 ? (
                    <li className="px-4 py-6 text-sm text-muted">
                      No upcoming events
                      {!showIncome && !showExpense
                        ? " — turn on Income or Expense."
                        : "."}
                    </li>
                  ) : (
                    upcoming.map((ev) => {
                      const oneOffTx =
                        ev.source === "transaction" && ev.tx_id != null
                          ? txs.find((t) => t.id === ev.tx_id)
                          : undefined;
                      return (
                        <li
                          key={ev.key}
                          className="flex min-h-[4.25rem] items-center justify-between gap-3 px-4 py-2 text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{ev.name}</div>
                            <div className="truncate text-muted">
                              {ev.date}
                              {ev.counterparty ? ` · ${ev.counterparty}` : ""}
                              {ev.source === "recurring" ? " · recurring" : ""}
                              {ev.amount_overridden ? " · edited" : ""}
                            </div>
                            {ev.balance_after != null ? (
                              <div className="mt-0.5 text-xs text-mint/90">
                                then {formatMoney(ev.balance_after)}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <div className="font-medium text-ink/90">
                              {ev.is_income ? "+" : "-"}
                              {formatMoney(ev.amount)}
                            </div>
                            {ev.source === "recurring" && ev.rule_id != null ? (
                              <>
                                <button
                                  type="button"
                                  aria-label={`Edit occurrence ${ev.name}`}
                                  onClick={() => openOccurrenceEdit(ev)}
                                  className="text-muted hover:text-ink"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Skip occurrence ${ev.name}`}
                                  onClick={() => deleteOccurrence(ev)}
                                  className="text-muted hover:text-red-400"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            ) : null}
                            {oneOffTx ? (
                              <>
                                <button
                                  type="button"
                                  aria-label={`Edit ${ev.name}`}
                                  onClick={() => openEditTransaction(oneOffTx)}
                                  className="text-muted hover:text-ink"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Delete ${ev.name}`}
                                  onClick={() => deleteTransaction(oneOffTx.id)}
                                  className="text-muted hover:text-red-400"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            ) : null}
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            </section>

            {/* Recurring */}
            <section>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold">Recurring</h2>
                <button
                  type="button"
                  aria-label="Add recurring rule"
                  onClick={startAddRule}
                  className="rounded-full border border-line p-1.5 text-mint hover:bg-mint/10"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
                {activeRules.map((r) =>
                  editingRuleId === r.id ? (
                    <Fragment key={r.id}>{renderRuleEditor()}</Fragment>
                  ) : (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <button
                        type="button"
                        onClick={() => startEditRule(r)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="font-medium">{r.name}</div>
                        <div className="text-muted">
                          every {r.interval_every} {r.interval_unit}
                          {r.category ? ` · ${r.category}` : ""}
                          {r.start_date ? ` · from ${r.start_date}` : ""}
                          {r.end_date ? ` · until ${r.end_date}` : ""}
                        </div>
                      </button>
                      <div className="flex shrink-0 items-center gap-2">
                        <div className="font-medium text-ink/90">
                          {r.is_income ? "+" : "-"}
                          {formatMoney(Number(r.amount))}
                        </div>
                        <button
                          type="button"
                          aria-label={`Edit ${r.name}`}
                          onClick={() => startEditRule(r)}
                          className="text-muted hover:text-ink"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${r.name}`}
                          onClick={() => deleteRule(r.id)}
                          className="text-muted hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  )
                )}
                {addingRule ? renderRuleEditor() : null}
                {activeRules.length === 0 && !addingRule ? (
                  <li className="px-4 py-6 text-sm text-muted">
                    No active recurring rules.
                  </li>
                ) : null}
              </ul>
            </section>

            {/* Recent */}
            <section>
              <h2 className="font-display text-lg font-semibold">
                Recent transactions
              </h2>
              <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
                {recentPast.map((tx) => (
                  <li
                    key={tx.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <button
                      type="button"
                      onClick={() => openEditTransaction(tx)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="font-medium">{tx.name}</div>
                      <div className="text-muted">
                        {tx.date}
                        {tx.counterparty ? ` · ${tx.counterparty}` : ""}
                        {tx.recurring_rule_id ? " · recurring" : ""}
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="font-medium text-ink/90">
                        {tx.is_income ? "+" : "-"}
                        {formatMoney(Number(tx.amount))}
                      </div>
                      <button
                        type="button"
                        aria-label={`Edit ${tx.name}`}
                        onClick={() => openEditTransaction(tx)}
                        className="text-muted hover:text-ink"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${tx.name}`}
                        onClick={() => deleteTransaction(tx.id)}
                        className="text-muted hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
                {recentPast.length === 0 ? (
                  <li className="px-4 py-6 text-sm text-muted">
                    No past transactions yet.
                  </li>
                ) : null}
              </ul>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
