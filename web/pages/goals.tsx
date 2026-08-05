"use client";

import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { supabase } from "@/lib/supabaseClient";
import NavBar from "@/components/navabar_2";
import PageColorPicker from "@/components/PageColorPicker";

type GoalRow = {
  id: number;
  created_at: string;
  goal_title: string;
  curr_num_value: number | null;
  goal_num_val: number | null;
  hit: boolean;
  date_hit: string | null;
  year: number | null;
  user_id: string;
};

type UserOption = {
  username: string | null;
  user_id: string;
};

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

export default function GoalsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<GoalRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [draftTitle, setDraftTitle] = useState("");
  const [draftGoalVal, setDraftGoalVal] = useState<string>("");
  const [draftCurrVal, setDraftCurrVal] = useState<string>("");
  const [draftHit, setDraftHit] = useState(false);
  const [draftDateHit, setDraftDateHit] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<GoalRow | null>(null);

  const hitGoals = useMemo(() => goals.filter((g) => g.hit), [goals]);
  const notHitGoals = useMemo(() => goals.filter((g) => !g.hit), [goals]);

  const canEdit = userId !== null && selectedUserId === userId;

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("users")
        .select("username, user_id");
      if (error || !data?.length) {
        setUsers([]);
        return;
      }
      setUsers(data as UserOption[]);
    })();
  }, []);

  useEffect(() => {
    if (selectedUserId === null && userId) setSelectedUserId(userId);
  }, [userId, selectedUserId]);

  useEffect(() => {
    if (!selectedUserId) return;
    setLoading(true);
    setErrMsg(null);
    supabase
      .from("goals")
      .select(
        "id, created_at, goal_title, curr_num_value, goal_num_val, hit, date_hit, year, user_id"
      )
      .eq("user_id", selectedUserId)
      .eq("year", year)
      .order("hit", { ascending: true })
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) setErrMsg(error.message);
        else setGoals((data as GoalRow[]) ?? []);
      })
      .then(
        () => setLoading(false),
        () => setLoading(false)
      );
  }, [selectedUserId, year]);

  function openCreate() {
    setEditing(null);
    setDraftTitle("");
    setDraftGoalVal("");
    setDraftCurrVal("");
    setDraftHit(false);
    setDraftDateHit("");
    setCreateOpen(true);
  }

  function openEdit(goal: GoalRow) {
    setCreateOpen(false);
    setEditing(goal);
    setDraftTitle(goal.goal_title);
    setDraftGoalVal(goal.goal_num_val != null ? String(goal.goal_num_val) : "");
    setDraftCurrVal(
      goal.curr_num_value != null ? String(goal.curr_num_value) : ""
    );
    setDraftHit(goal.hit);
    setDraftDateHit(goal.date_hit ?? "");
  }

  function closeModals() {
    setCreateOpen(false);
    setEditing(null);
  }

  async function saveCreate() {
    if (!userId || !draftTitle.trim()) return;
    setSaving(true);
    setErrMsg(null);
    const goalNum = draftGoalVal.trim() ? parseInt(draftGoalVal, 10) : null;
    const currNum = draftCurrVal.trim() ? parseInt(draftCurrVal, 10) : null;
    const { data, error } = await supabase
      .from("goals")
      .insert({
        user_id: userId,
        year,
        goal_title: draftTitle.trim(),
        goal_num_val: Number.isNaN(goalNum) ? null : goalNum,
        curr_num_value: Number.isNaN(currNum) ? null : currNum,
        hit: false,
        date_hit: null,
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      setErrMsg(error.message);
      return;
    }
    if (data) setGoals((prev) => [...prev, data as GoalRow]);
    setCreateOpen(false);
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    setErrMsg(null);
    const goalNum = draftGoalVal.trim() ? parseInt(draftGoalVal, 10) : null;
    const currNum = draftCurrVal.trim() ? parseInt(draftCurrVal, 10) : null;
    const { error } = await supabase
      .from("goals")
      .update({
        goal_title: draftTitle.trim(),
        goal_num_val: Number.isNaN(goalNum) ? null : goalNum,
        curr_num_value: Number.isNaN(currNum) ? null : currNum,
        hit: draftHit,
        date_hit: draftHit && draftDateHit ? draftDateHit : null,
      })
      .eq("id", editing.id);
    setSaving(false);
    if (error) {
      setErrMsg(error.message);
      return;
    }
    setGoals((prev) =>
      prev.map((g) =>
        g.id === editing.id
          ? {
              ...g,
              goal_title: draftTitle.trim(),
              goal_num_val: Number.isNaN(goalNum) ? null : goalNum,
              curr_num_value: Number.isNaN(currNum) ? null : currNum,
              hit: draftHit,
              date_hit: draftHit && draftDateHit ? draftDateHit : null,
            }
          : g
      )
    );
    setEditing(null);
  }

  function displayUser(u: UserOption) {
    return u.username ?? u.user_id.slice(0, 8);
  }

  async function adjustCurrValue(goal: GoalRow, delta: number) {
    if (goal.curr_num_value == null && goal.goal_num_val == null) return;
    const next = (goal.curr_num_value ?? 0) + delta;
    const { error } = await supabase
      .from("goals")
      .update({ curr_num_value: next })
      .eq("id", goal.id);
    if (error) {
      setErrMsg(error.message);
      return;
    }
    setGoals((prev) =>
      prev.map((g) => (g.id === goal.id ? { ...g, curr_num_value: next } : g))
    );
  }

  async function deleteGoal(goal: GoalRow) {
    setErrMsg(null);
    const { error } = await supabase.from("goals").delete().eq("id", goal.id);
    if (error) {
      setErrMsg(error.message);
      return;
    }
    setGoals((prev) => prev.filter((g) => g.id !== goal.id));
    setDeleteConfirm(null);
  }

  return (
    <div className="min-h-screen bg-background text-text">
      <Head>
        <title>Goals</title>
      </Head>
      <NavBar />
      <div className="mx-auto flex flex-col items-center px-4 py-6">
        {errMsg ? (
          <div className="mb-4 w-full max-w-6xl rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-text">
            {errMsg}
          </div>
        ) : null}

        <div className="w-full max-w-6xl rounded-2xl border border-primary/20 bg-secondary/50 p-6 sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-semibold text-text">Goals</h1>
            <div className="flex flex-wrap items-center gap-2">
              <PageColorPicker />
              <label className="flex items-center gap-2 text-sm text-text">
                <span>User</span>
                <select
                  value={selectedUserId ?? ""}
                  onChange={(e) => setSelectedUserId(e.target.value || null)}
                  className="rounded-lg border border-primary/30 bg-background px-2 py-1.5 text-text outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {users.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {displayUser(u)}
                    </option>
                  ))}
                  {users.length === 0 && <option value="">—</option>}
                </select>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setYear((y) => y - 1)}
                  className="rounded-lg border border-primary/40 px-2 py-1.5 text-sm text-text hover:bg-primary/20"
                >
                  ←
                </button>
                <span className="min-w-[4rem] text-center text-sm font-medium text-text">
                  {year}
                </span>
                <button
                  type="button"
                  onClick={() => setYear((y) => y + 1)}
                  className="rounded-lg border border-primary/40 px-2 py-1.5 text-sm text-text hover:bg-primary/20"
                >
                  →
                </button>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="rounded-lg border border-primary/40 px-3 py-1.5 text-sm text-text hover:bg-primary/20"
                >
                  Create goal
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <p className="py-4 text-center text-sm text-text/70">Loading…</p>
          ) : (
            <>
              <section className="mb-6">
                <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-text/80">
                  Hit
                </h2>
                <ul className="flex flex-col gap-2">
                  {hitGoals.length === 0 ? (
                    <li className="rounded-xl border border-dashed border-primary/30 py-4 text-center text-sm text-text/60">
                      No hit goals
                    </li>
                  ) : (
                    hitGoals.map((g) => (
                      <li key={g.id}>
                        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-secondary/70 px-3 py-2">
                          <button
                            type="button"
                            onClick={() => canEdit && openEdit(g)}
                            disabled={!canEdit}
                            className={`min-w-0 flex-1 text-left text-sm transition ${
                              canEdit
                                ? "hover:opacity-90 cursor-pointer"
                                : "cursor-default"
                            }`}
                          >
                            <span className="font-medium text-text">
                              {g.goal_title}
                            </span>
                            {(g.goal_num_val != null ||
                              g.curr_num_value != null) && (
                              <span className="ml-2 text-text/70">
                                {g.curr_num_value != null
                                  ? g.curr_num_value
                                  : "—"}
                                {g.goal_num_val != null &&
                                  ` / ${g.goal_num_val}`}
                              </span>
                            )}
                            {g.date_hit && (
                              <span className="ml-2 text-xs text-text/60">
                                hit {g.date_hit}
                              </span>
                            )}
                          </button>
                          {(g.goal_num_val != null ||
                            g.curr_num_value != null) &&
                            canEdit && (
                              <div className="flex items-center gap-0 rounded-lg border border-primary/30 bg-background/80">
                                <button
                                  type="button"
                                  onClick={() => adjustCurrValue(g, -1)}
                                  className="px-2 py-1 text-text hover:bg-primary/20"
                                  aria-label="Decrease"
                                >
                                  −
                                </button>
                                <span className="min-w-[2rem] px-1 text-center text-sm text-text/80">
                                  {g.curr_num_value ?? 0}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => adjustCurrValue(g, 1)}
                                  className="px-2 py-1 text-text hover:bg-primary/20"
                                  aria-label="Increase"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm(g)}
                              className="rounded-lg border border-red-500/50 px-2 py-1 text-sm text-red-400 hover:bg-red-500/20"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </section>

              <section>
                <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-text/80">
                  Not hit
                </h2>
                <ul className="flex flex-col gap-2">
                  {notHitGoals.length === 0 ? (
                    <li className="rounded-xl border border-dashed border-primary/30 py-4 text-center text-sm text-text/60">
                      No goals yet
                    </li>
                  ) : (
                    notHitGoals.map((g) => (
                      <li key={g.id}>
                        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-secondary/70 px-3 py-2">
                          <button
                            type="button"
                            onClick={() => canEdit && openEdit(g)}
                            disabled={!canEdit}
                            className={`min-w-0 flex-1 text-left text-sm transition ${
                              canEdit
                                ? "hover:opacity-90 cursor-pointer"
                                : "cursor-default"
                            }`}
                          >
                            <span className="font-medium text-text">
                              {g.goal_title}
                            </span>
                            {(g.goal_num_val != null ||
                              g.curr_num_value != null) && (
                              <span className="ml-2 text-text/70">
                                {g.curr_num_value != null
                                  ? g.curr_num_value
                                  : "—"}
                                {g.goal_num_val != null &&
                                  ` / ${g.goal_num_val}`}
                              </span>
                            )}
                          </button>
                          {(g.goal_num_val != null ||
                            g.curr_num_value != null) &&
                            canEdit && (
                              <div className="flex items-center gap-0 rounded-lg border border-primary/30 bg-background/80">
                                <button
                                  type="button"
                                  onClick={() => adjustCurrValue(g, -1)}
                                  className="px-2 py-1 text-text hover:bg-primary/20"
                                  aria-label="Decrease"
                                >
                                  −
                                </button>
                                <span className="min-w-[2rem] px-1 text-center text-sm text-text/80">
                                  {g.curr_num_value ?? 0}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => adjustCurrValue(g, 1)}
                                  className="px-2 py-1 text-text hover:bg-primary/20"
                                  aria-label="Increase"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm(g)}
                              className="rounded-lg border border-red-500/50 px-2 py-1 text-sm text-red-400 hover:bg-red-500/20"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            </>
          )}
        </div>
      </div>

      <Modal open={createOpen} title="New goal" onClose={closeModals}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text">
              Goal title *
            </label>
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="e.g. Run 500 miles"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text">
              Goal value (optional)
            </label>
            <input
              type="number"
              value={draftGoalVal}
              onChange={(e) => setDraftGoalVal(e.target.value)}
              className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="e.g. 500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text">
              Current value (optional)
            </label>
            <input
              type="number"
              value={draftCurrVal}
              onChange={(e) => setDraftCurrVal(e.target.value)}
              className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="e.g. 120"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeModals}
              className="rounded-lg border border-primary/40 px-4 py-2 text-sm text-text hover:bg-primary/20"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveCreate}
              disabled={saving || !draftTitle.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-reverse disabled:opacity-50"
            >
              {saving ? "Saving…" : "Create"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteConfirm}
        title="Delete goal"
        onClose={() => setDeleteConfirm(null)}
      >
        {deleteConfirm && (
          <div className="space-y-4">
            <p className="text-text">
              Are you sure you want to delete &quot;{deleteConfirm.goal_title}
              &quot;?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-primary/40 px-4 py-2 text-sm text-text hover:bg-primary/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteGoal(deleteConfirm)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!editing} title="Edit goal" onClose={closeModals}>
        {editing && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text">
                Goal title *
              </label>
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text">
                Goal value (optional)
              </label>
              <input
                type="number"
                value={draftGoalVal}
                onChange={(e) => setDraftGoalVal(e.target.value)}
                className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text">
                Current value (optional)
              </label>
              <input
                type="number"
                value={draftCurrVal}
                onChange={(e) => setDraftCurrVal(e.target.value)}
                className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-hit"
                checked={draftHit}
                onChange={(e) => setDraftHit(e.target.checked)}
                className="rounded border-primary/40"
              />
              <label htmlFor="edit-hit" className="text-sm text-text">
                Mark as hit
              </label>
            </div>
            {draftHit && (
              <div>
                <label className="block text-sm font-medium text-text">
                  Date hit
                </label>
                <input
                  type="date"
                  value={draftDateHit}
                  onChange={(e) => setDraftDateHit(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeModals}
                className="rounded-lg border border-primary/40 px-4 py-2 text-sm text-text hover:bg-primary/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving || !draftTitle.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-reverse disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
