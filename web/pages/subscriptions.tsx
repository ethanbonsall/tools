"use client";

import React, { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import { supabase } from "@/lib/supabaseClient";
import NavBar from "@/components/navabar_2";
import PageColorPicker from "@/components/PageColorPicker";

type SubscriptionRow = {
  id: number;
  created_at: string;
  name: string | null;
  amount: number | null;
  end: string | null;
  user_id: string | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
function daysFromToday(dateStr: string): number {
  const part = dateStr.slice(0, 10);
  const d = new Date(part + "T12:00:00");
  const t = new Date();
  t.setHours(12, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / MS_PER_DAY);
}

function formatEnd(dateStr: string | null): string {
  if (!dateStr) return "—";
  const part = dateStr.slice(0, 10);
  const d = new Date(part + "T12:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sameDayNextMonth(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setMonth(d.getMonth() + 1);
  return toISODate(d);
}

/** Normalize DB value to YYYY-MM-DD (Supabase may return timestamp with time). */
function toDateOnly(value: string | null): string | null {
  if (!value) return null;
  const part = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(part) ? part : null;
}

export default function SubscriptionsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<"name" | "amount" | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalError, setAddModalError] = useState<string | null>(null);

  const loadSubscriptions = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("subscriptions")
      .select("id, created_at, name, amount, end, user_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (fetchError) {
      setLoading(false);
      setError(fetchError.message);
      return;
    }
    const rows = (data as SubscriptionRow[]) ?? [];
    const today = toISODate(new Date());
    const updated: SubscriptionRow[] = [];
    for (const s of rows) {
      const endDateOnly = toDateOnly(s.end);
      const shouldRoll = endDateOnly && endDateOnly <= today;
      if (shouldRoll) {
        const next = sameDayNextMonth(endDateOnly);
        const { error: updateErr } = await supabase
          .from("subscriptions")
          .update({ end: next })
          .eq("id", s.id)
          .eq("user_id", userId);
        updated.push(updateErr ? s : { ...s, end: next });
      } else {
        updated.push(s);
      }
    }
    setSubscriptions(updated);
    setLoading(false);
  }, [userId]);

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
    loadSubscriptions();
  }, [userId, loadSubscriptions]);

  const total = subscriptions.reduce((sum, s) => sum + (s.amount ?? 0), 0);

  function openAddModal() {
    setName("");
    setAmount("");
    setEndDate("");
    setAddModalError(null);
    setShowAddModal(true);
  }

  function closeAddModal() {
    setShowAddModal(false);
    setAddModalError(null);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const trimmed = amount.trim();
    const num = trimmed === "" ? 0 : parseFloat(trimmed);
    if (Number.isNaN(num) || num < 0) {
      setAddModalError("Enter a valid amount");
      return;
    }
    const trimmedName = name.trim() || "Subscription";
    setSaving(true);
    setAddModalError(null);
    const { data, error: insertError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        name: trimmedName,
        amount: num,
        end: endDate.trim() || null,
      })
      .select()
      .single();
    setSaving(false);
    if (insertError) {
      setAddModalError(insertError.message);
      return;
    }
    if (data) setSubscriptions((prev) => [...prev, data as SubscriptionRow]);
    setName("");
    setAmount("");
    setEndDate("");
    closeAddModal();
  }

  function startEditName(s: SubscriptionRow) {
    setEditingId(s.id);
    setEditingField("name");
    setEditName(s.name ?? "");
  }

  function startEditAmount(s: SubscriptionRow) {
    setEditingId(s.id);
    setEditingField("amount");
    setEditAmount(s.amount != null ? String(s.amount) : "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingField(null);
    setEditName("");
    setEditAmount("");
  }

  async function saveEditName() {
    if (editingId == null || editingField !== "name" || !userId) return;
    const newName = editName.trim() || "Subscription";
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({ name: newName })
      .eq("id", editingId)
      .eq("user_id", userId);
    setSaving(false);
    if (updateError) setError(updateError.message);
    else
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === editingId ? { ...s, name: newName } : s))
      );
    cancelEdit();
  }

  async function saveEditAmount() {
    if (editingId == null || editingField !== "amount" || !userId) return;
    const num = parseFloat(editAmount.trim());
    if (Number.isNaN(num) || num < 0) {
      setError("Enter a valid amount");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({ amount: num })
      .eq("id", editingId)
      .eq("user_id", userId);
    setSaving(false);
    if (updateError) setError(updateError.message);
    else
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === editingId ? { ...s, amount: num } : s))
      );
    cancelEdit();
  }

  async function handleDelete(id: number) {
    const { error: deleteError } = await supabase
      .from("subscriptions")
      .delete()
      .eq("id", id);
    if (deleteError) setError(deleteError.message);
    else setSubscriptions((prev) => prev.filter((s) => s.id !== id));
  }

  function renderAmount(amount: number | null) {
    if (amount == null || amount === 0) return "Free";
    return `$${amount.toFixed(2)}`;
  }

  return (
    <>
      <Head>
        <title>Subscriptions</title>
      </Head>
      <NavBar />
      <main className="min-h-screen bg-background text-text px-4 py-8 flex justify-center items-start">
        <div className="w-full max-w-2xl rounded-2xl border border-primary/30 bg-background/90 shadow-xl shadow-primary/10 p-5 md:p-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <h1 className="text-2xl font-semibold">Subscriptions</h1>
            <div className="flex shrink-0 items-center gap-2">
              <PageColorPicker />
              <button
                type="button"
                onClick={openAddModal}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
              >
                Add
              </button>
            </div>
          </div>

          {showAddModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={(e) => e.target === e.currentTarget && closeAddModal()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-modal-title"
            >
              <div
                className="w-full max-w-sm rounded-2xl border border-primary/30 bg-background shadow-xl p-5"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 id="add-modal-title" className="text-lg font-semibold mb-4">
                  Add subscription
                </h2>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div>
                    <label className="block text-sm text-text/70 mb-1">Name*</label>
                    <input
                      type="text"
                      placeholder="Subscription name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-primary/40 bg-background text-text placeholder:text-text/60"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text/70 mb-1">Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0 (free)"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-primary/40 bg-background text-text placeholder:text-text/60"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text/70 mb-1">
                      Next charge / trial end 
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-primary/40 bg-background text-text"
                      title="Reminder: next billing date or when a free trial ends. Shown in red when within a week."
                    />
                  </div>
                  {addModalError && (
                    <p className="text-red-500 text-sm" role="alert">
                      {addModalError}
                    </p>
                  )}
                  <div className="flex gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      {saving ? "Adding…" : "Add"}
                    </button>
                    <button
                      type="button"
                      onClick={closeAddModal}
                      className="px-4 py-2 rounded-lg border border-primary/40 hover:bg-primary/10"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm mb-4" role="alert">
              {error}
            </p>
          )}

          {loading ? (
            <p className="text-text/70">Loading…</p>
          ) : subscriptions.length === 0 ? (
            <p className="text-text/70">No subscriptions yet. Add one above.</p>
          ) : (
            <>
              <ul className="space-y-3 mb-5">
                {subscriptions.map((s) => {
                  const isEditingName = editingId === s.id && editingField === "name";
                  const isEditingAmount = editingId === s.id && editingField === "amount";
                  const endDays = s.end ? daysFromToday(s.end) : null;
                  const isTrial = s.amount == null || s.amount === 0;
                  const endSoon = isTrial && endDays != null && endDays >= 0 && endDays <= 7;
                  return (
                    <li
                      key={s.id}
                      className="flex items-center gap-3 py-2 rounded-xl border border-primary/20 bg-background/50 px-3 w-full"
                    >
                      <div className="flex-1 min-w-0 flex items-center">
                        {isEditingName ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={saveEditName}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEditName();
                              if (e.key === "Escape") cancelEdit();
                            }}
                            autoFocus
                            className="w-full px-2 py-1 rounded-lg border border-primary/40 bg-background text-text text-sm"
                            placeholder="Name"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditName(s)}
                            className="text-left w-full truncate hover:bg-primary/10 rounded px-1 py-0.5 -mx-1"
                          >
                            {s.name ?? "—"}
                          </button>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex items-center justify-end">
                        {isEditingAmount ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            onBlur={saveEditAmount}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEditAmount();
                              if (e.key === "Escape") cancelEdit();
                            }}
                            autoFocus
                            className="w-full max-w-[120px] px-2 py-1 rounded-lg border border-primary/40 bg-background text-text text-sm text-right"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditAmount(s)}
                            className="font-medium hover:bg-primary/10 rounded px-1 py-0.5 -mx-1"
                          >
                            {renderAmount(s.amount)}
                          </button>
                        )}
                      </div>
                      <div
                        className={`shrink-0 text-sm ${endSoon ? "text-red-500 font-medium" : "text-text/70"}`}
                        title={s.end ? (endSoon ? "Charge / trial date coming up within a week" : "Next charge or trial end date") : ""}
                      >
                        {s.end ? formatEnd(s.end) : "—"}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id)}
                        className="shrink-0 px-2 py-1 rounded border border-red-500/50 text-red-500 text-xs hover:bg-red-500/10 transition-colors"
                        title="Delete subscription"
                      >
                        Delete
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="text-lg font-semibold border-t border-primary/30 pt-4">
                Total: {total === 0 ? "Free" : `$${total.toFixed(2)}`}/month
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
