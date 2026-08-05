/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import NavBar from "@/components/navabar_2";
import Head from "next/head";
import PageColorPicker from "@/components/PageColorPicker";
import { supabase } from "@/lib/supabaseClient";

/**
 * Week Todo Calendar (Google Calendar-ish week view)
 * - 7-day week starting Sunday
 * - Week arrows to navigate
 * - Drag todos up/down within a day to reorder priority
 * - Drag todos between days to change task_date (and reprioritize both days)
 * - Backed by Supabase table public.todos (schema from prompt)
 *
 * Dependencies:
 *   npm i @supabase/supabase-js @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
 */

type TodoRow = {
  id: number;
  created_at: string;
  task_date: string; // YYYY-MM-DD
  priority: number; // smallint
  due_date: string | null; // YYYY-MM-DD
  title: string;
  content: string | null;
  user_id: string; // UUID
  completed: boolean;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date) {
  // local date -> YYYY-MM-DD
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

function fromISODate(s: string) {
  // YYYY-MM-DD -> Date (local)
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfWeekSunday(d: Date) {
  const dt = new Date(d);
  const day = dt.getDay(); // 0 = Sun
  dt.setDate(dt.getDate() - day);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function addDays(d: Date, days: number) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + days);
  return dt;
}

function clampYear2100(d: Date) {
  const min = new Date(1900, 0, 1);
  const max = new Date(2100, 11, 31);
  if (d < min) return min;
  if (d > max) return max;
  return d;
}

function prettyDow(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function prettyMD(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isSameISO(a: string, b: string) {
  return a === b;
}

function sortByPriority(items: TodoRow[]) {
  return [...items].sort((a, b) => a.priority - b.priority);
}

/** Generates consecutive priorities 1..n */
function withReprioritized(items: TodoRow[]) {
  return items.map((t, i) => ({ ...t, priority: i + 1 }));
}

function dayIdFromISO(iso: string) {
  return `day:${iso}`;
}

/** Wraps day body so the column is a droppable when empty */
function DroppableDayBody({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={[className, isOver ? "bg-primary/10" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

function isDayId(id: string) {
  return id.startsWith("day:");
}

function isoFromDayId(dayId: string) {
  return dayId.replace("day:", "");
}

type DraftTodo = {
  title: string;
  content: string;
  due_date: string; // "" or YYYY-MM-DD
};

function SortableTodoCard({
  todo,
  onEdit,
  onDelete,
  onComplete,
}: {
  todo: TodoRow;
  onEdit: (t: TodoRow) => void;
  onDelete: (t: TodoRow) => void;
  onComplete: (t: TodoRow) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `todo:${todo.id}` });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "group relative rounded-xl border border-primary/20 bg-secondary/70 p-3 shadow-sm",
        "hover:border-primary/40 hover:bg-secondary/90 hover:shadow transition cursor-grab active:cursor-grabbing",
        isDragging ? "opacity/50" : "",
      ].join(" ")}
      {...attributes}
      {...listeners}
    >
      <div className="flex flex-col items-start gap-2">
        <div className="flex flex-row shrink-0 gap-1 justify-between w-full">
          <button
            className="flex h-3 w-3 items-center justify-center text-sm text-text/60 hover:text-red-400 transition"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(todo);
            }}
            type="button"
            aria-label="Delete"
          >
            ×
          </button>
          <button
            className="flex h-3 w-3 items-center justify-center text-sm text-text/60 hover:text-green-400 transition"
            onClick={(e) => {
              e.stopPropagation();
              onComplete(todo);
            }}
            type="button"
            aria-label="Complete"
          >
            ✓
          </button>
        </div>

        <button
          className="min-w-0 flex-1 text-left font-normal"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(todo);
          }}
          type="button"
        >
          <div className="flex flex-col items-start gap-2">
            <span
              className={`text-xs font-normal normal-case text-text line-clamp-1 ${
                todo.completed ? "line-through" : ""
              }`}
            >
              {todo.title}
            </span>
            {todo.due_date ? (
              <span
                className={`shrink-0 rounded-full text-xs font-medium text-text/80 normal-case ${
                  todo.completed ? "line-through" : ""
                }`}
              >
                Due {todo.due_date}
              </span>
            ) : null}
          </div>
          {todo.content ? (
            <p
              className={`mt-1 line-clamp-5 text-xs text-text/70 whitespace-pre-line normal-case ${
                todo.completed ? "line-through" : ""
              }`}
            >
              {todo.content}
            </p>
          ) : null}
        </button>
      </div>
    </div>
  );
}

function OverlayCard({ todo }: { todo: TodoRow }) {
  return (
    <div className="w-[260px] rounded-xl border border-primary/30 bg-secondary p-3 shadow-lg">
      <div className="truncate text-sm font-medium normal-case text-text">
        {todo.title}
      </div>
      {todo.due_date ? (
        <div className="mt-1 text-xs text-text/80 normal-case">
          due {todo.due_date}
        </div>
      ) : null}
      {todo.content ? (
        <div className="mt-2 line-clamp-2 whitespace-pre-line text-xs text-text/70 normal-case">
          {todo.content}
        </div>
      ) : null}
    </div>
  );
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

export default function WeekTodoCalendarPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const [weekAnchor, setWeekAnchor] = useState<Date>(() =>
    startOfWeekSunday(clampYear2100(new Date()))
  );

  const weekStart = useMemo(() => startOfWeekSunday(weekAnchor), [weekAnchor]);
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const rangeStartISO = useMemo(() => toISODate(weekStart), [weekStart]);
  const rangeEndISOExclusive = useMemo(
    () => toISODate(addDays(weekStart, 7)),
    [weekStart]
  );

  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // Modal state (create/edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDayISO, setModalDayISO] = useState<string>(rangeStartISO);
  const [editing, setEditing] = useState<TodoRow | null>(null);
  const [draft, setDraft] = useState<DraftTodo>({
    title: "",
    content: "",
    due_date: "",
  });
  const [saving, setSaving] = useState(false);

  // DnD overlay
  const [activeTodo, setActiveTodo] = useState<TodoRow | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const todosByDay = useMemo(() => {
    const map = new Map<string, TodoRow[]>();
    for (const day of weekDays) map.set(toISODate(day), []);
    for (const t of todos) {
      if (!map.has(t.task_date)) continue;
      // Filter out completed tasks unless showCompleted is true
      if (!showCompleted && t.completed) continue;
      map.get(t.task_date)!.push(t);
    }
    for (const [k, v] of map) map.set(k, sortByPriority(v));
    return map;
  }, [todos, weekDays, showCompleted]);

  // Get current user on mount
  useEffect(() => {
    async function getCurrentUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    }
    getCurrentUser();
  }, [supabase]);

  async function loadWeek() {
    if (!userId) return;

    setLoading(true);
    setErrMsg(null);
    try {
      const { data, error } = await supabase
        .from("todos")
        .select(
          "id,created_at,task_date,priority,due_date,title,content,user_id,completed"
        )
        .eq("user_id", userId)
        .gte("task_date", rangeStartISO)
        .lt("task_date", rangeEndISOExclusive)
        .order("task_date", { ascending: true })
        .order("priority", { ascending: true });

      if (error) throw error;
      setTodos((data ?? []) as TodoRow[]);
    } catch (e: any) {
      setErrMsg(e?.message ?? "Failed to load week.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (userId) {
      loadWeek();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStartISO, rangeEndISOExclusive, userId]);

  function openCreate(dayISO: string) {
    setEditing(null);
    setModalDayISO(dayISO);
    setDraft({ title: "", content: "", due_date: "" });
    setModalOpen(true);
  }

  function openEdit(todo: TodoRow) {
    setEditing(todo);
    setModalDayISO(todo.task_date);
    setDraft({
      title: todo.title,
      content: todo.content ?? "",
      due_date: todo.due_date ?? "",
    });
    setModalOpen(true);
  }

  async function toggleComplete(todo: TodoRow) {
    try {
      const { error } = await supabase
        .from("todos")
        .update({ completed: !todo.completed })
        .eq("id", todo.id);

      if (error) throw error;

      // Optimistic update
      setTodos((prev) =>
        prev.map((t) =>
          t.id === todo.id ? { ...t, completed: !t.completed } : t
        )
      );
    } catch (e: any) {
      setErrMsg(e?.message ?? "Failed to toggle completion.");
      await loadWeek();
    }
  }

  async function saveTodo() {
    if (!userId) {
      setErrMsg("Please log in to create tasks.");
      return;
    }

    const title = draft.title.trim();
    if (!title) return;

    // basic date sanity (supports up to year 2100)
    const day = fromISODate(modalDayISO);
    if (day.getFullYear() > 2100) return;

    setSaving(true);
    setErrMsg(null);

    try {
      if (editing) {
        const dayChanged = modalDayISO !== editing.task_date;
        const targetDayTodos = todosByDay.get(modalDayISO) ?? [];
        const nextPriority = dayChanged
          ? targetDayTodos.length + 1
          : editing.priority;

        const patch = {
          title,
          content: draft.content.trim() ? draft.content.trim() : null,
          due_date: draft.due_date ? draft.due_date : null,
          task_date: modalDayISO,
          priority: nextPriority,
        };

        // optimistic: update todo and reprioritize old day if moved
        setTodos((prev) => {
          let next = prev.map((t) =>
            t.id === editing.id ? { ...t, ...patch } : t
          );
          if (dayChanged) {
            const oldDay = editing.task_date;
            const oldDayRemaining = next
              .filter((t) => t.task_date === oldDay && t.id !== editing.id)
              .sort((a, b) => a.priority - b.priority);
            const reprioritizedOld = withReprioritized(oldDayRemaining);
            const newDayList = next
              .filter((t) => t.task_date === modalDayISO)
              .sort((a, b) => a.priority - b.priority);
            const reprioritizedNew = withReprioritized(newDayList);
            next = next.map((t) => {
              if (t.task_date === oldDay && t.id !== editing.id) {
                const found = reprioritizedOld.find((x) => x.id === t.id);
                return found ? { ...t, priority: found.priority } : t;
              }
              if (t.task_date === modalDayISO) {
                const found = reprioritizedNew.find((x) => x.id === t.id);
                return found ? { ...t, priority: found.priority } : t;
              }
              return t;
            });
          }
          return next;
        });

        const { error } = await supabase
          .from("todos")
          .update(patch)
          .eq("id", editing.id);

        if (error) throw error;

        if (dayChanged) {
          const oldDay = editing.task_date;
          const oldDayRemaining = (todosByDay.get(oldDay) ?? []).filter(
            (t) => t.id !== editing.id
          );
          await persistDayPriorities(
            oldDay,
            withReprioritized(oldDayRemaining)
          );
          const newDayList = [
            ...(todosByDay.get(modalDayISO) ?? []).filter(
              (t) => t.id !== editing.id
            ),
            { ...editing, ...patch },
          ].sort((a, b) => a.priority - b.priority);
          await persistDayPriorities(
            modalDayISO,
            withReprioritized(newDayList)
          );
        }
      } else {
        const existing = todosByDay.get(modalDayISO) ?? [];
        const nextPriority = existing.length + 1;

        const insertRow = {
          task_date: modalDayISO,
          priority: nextPriority,
          due_date: draft.due_date ? draft.due_date : null,
          title,
          content: draft.content.trim() ? draft.content.trim() : null,
          user_id: userId,
          completed: false,
        };

        const { data, error } = await supabase
          .from("todos")
          .insert(insertRow)
          .select(
            "id,created_at,task_date,priority,due_date,title,content,user_id,completed"
          )
          .single();

        if (error) throw error;

        if (data) setTodos((prev) => [...prev, data as TodoRow]);
      }

      setModalOpen(false);
    } catch (e: any) {
      setErrMsg(e?.message ?? "Save failed.");
      // reload to be safe if optimistic update drifted
      await loadWeek();
    } finally {
      setSaving(false);
    }
  }

  async function deleteTodo(todo: TodoRow) {
    // optimistic remove + reprioritize day
    const dayISO = todo.task_date;
    const remaining = (todosByDay.get(dayISO) ?? []).filter(
      (t) => t.id !== todo.id
    );
    const reprioritized = withReprioritized(remaining);

    setTodos((prev) => {
      const kept = prev.filter((t) => t.id !== todo.id);
      return kept.map((t) => {
        if (t.task_date !== dayISO) return t;
        const found = reprioritized.find((x) => x.id === t.id);
        return found ? { ...t, priority: found.priority } : t;
      });
    });

    try {
      const { error: delErr } = await supabase
        .from("todos")
        .delete()
        .eq("id", todo.id);
      if (delErr) throw delErr;

      // write new priorities for the day (only the ones that changed)
      const updates = reprioritized.map((t) => ({
        id: t.id,
        priority: t.priority,
      }));
      // Do a few updates individually (simple + reliable).
      for (const u of updates) {
        const { error } = await supabase
          .from("todos")
          .update({ priority: u.priority })
          .eq("id", u.id);
        if (error) throw error;
      }
    } catch (e: any) {
      setErrMsg(e?.message ?? "Delete failed.");
      await loadWeek();
    }
  }

  function findTodoByDnDId(id: string | number): TodoRow | null {
    const s = String(id);
    if (!s.startsWith("todo:")) return null;
    const tid = Number(s.replace("todo:", ""));
    return todos.find((t) => t.id === tid) ?? null;
  }

  function findContainerDayISO(overId: string | number): string | null {
    const s = String(overId);
    if (isDayId(s)) return isoFromDayId(s);
    if (s.startsWith("todo:")) {
      const t = findTodoByDnDId(s);
      return t?.task_date ?? null;
    }
    return null;
  }

  async function persistDayPriorities(dayISO: string, dayTodos: TodoRow[]) {
    // Persist priorities (1..n). Updates only if needed.
    for (const t of dayTodos) {
      const { error } = await supabase
        .from("todos")
        .update({ priority: t.priority, task_date: t.task_date })
        .eq("id", t.id);
      if (error) throw error;
    }
  }

  async function handleDragEnd(evt: DragEndEvent) {
    const { active, over } = evt;
    setActiveTodo(null);

    if (!over) return;

    const activeTodo = findTodoByDnDId(active.id);
    if (!activeTodo) return;

    const fromDay = activeTodo.task_date;
    const toDay = findContainerDayISO(over.id);
    if (!toDay) return;

    // Current sorted lists
    const fromList = sortByPriority(todosByDay.get(fromDay) ?? []);
    const toList = sortByPriority(todosByDay.get(toDay) ?? []);

    // within same day reorder
    if (isSameISO(fromDay, toDay)) {
      const oldIndex = fromList.findIndex((t) => t.id === activeTodo.id);
      if (oldIndex === -1) return;

      let newIndex = oldIndex;
      const overStr = String(over.id);
      if (overStr.startsWith("todo:")) {
        const overTodo = findTodoByDnDId(overStr);
        if (overTodo) {
          newIndex = fromList.findIndex((t) => t.id === overTodo.id);
          if (newIndex === -1) newIndex = oldIndex;
        }
      } else {
        // dropped on the day container itself -> move to end
        newIndex = fromList.length - 1;
      }

      if (oldIndex === newIndex) return;

      const moved = arrayMove(fromList, oldIndex, newIndex);
      const reprioritized = withReprioritized(moved);

      // optimistic apply
      setTodos((prev) =>
        prev.map((t) => {
          if (t.task_date !== fromDay) return t;
          const found = reprioritized.find((x) => x.id === t.id);
          return found ? { ...t, priority: found.priority } : t;
        })
      );

      try {
        await persistDayPriorities(fromDay, reprioritized);
      } catch (e: any) {
        setErrMsg(e?.message ?? "Reorder failed.");
        await loadWeek();
      }
      return;
    }

    // moving between days
    const fromIndex = fromList.findIndex((t) => t.id === activeTodo.id);
    if (fromIndex === -1) return;

    const overStr = String(over.id);
    let insertIndex = toList.length; // default end
    if (overStr.startsWith("todo:")) {
      const overTodo = findTodoByDnDId(overStr);
      if (overTodo && overTodo.task_date === toDay) {
        const idx = toList.findIndex((t) => t.id === overTodo.id);
        insertIndex = idx === -1 ? toList.length : idx;
      }
    }

    const movingTodo: TodoRow = { ...activeTodo, task_date: toDay };
    const newFrom = withReprioritized(
      fromList.filter((t) => t.id !== activeTodo.id)
    );

    const toWithout = toList.filter((t) => t.id !== activeTodo.id);
    const newToRaw = [
      ...toWithout.slice(0, insertIndex),
      movingTodo,
      ...toWithout.slice(insertIndex),
    ];
    const newTo = withReprioritized(newToRaw).map((t) => ({
      ...t,
      task_date: toDay,
    }));

    // optimistic apply for both days
    setTodos(
      (prev) =>
        prev.map((t) => {
          // moved item
          if (t.id === activeTodo.id) {
            const moved = newTo.find((x) => x.id === t.id);
            return moved ? { ...t, ...moved } : { ...t, task_date: toDay };
          }

          if (t.task_date === fromDay) {
            const found = newFrom.find((x) => x.id === t.id);
            return found ? { ...t, priority: found.priority } : t;
          }

          if (t.task_date === toDay) {
            const found = newTo.find((x) => x.id === t.id);
            return found ? { ...t, priority: found.priority } : t;
          }

          return t;
        })
      // if moved item wasn’t in prev for some reason, ensure it exists
    );

    try {
      // Persist: update task_date + priority for all todos in both days
      await persistDayPriorities(fromDay, newFrom);
      await persistDayPriorities(toDay, newTo);
    } catch (e: any) {
      setErrMsg(e?.message ?? "Move failed.");
      await loadWeek();
    }
  }

  function handleDragStart(activeId: string | number) {
    const t = findTodoByDnDId(activeId);
    if (t) setActiveTodo(t);
  }

  function gotoPrevWeek() {
    const prev = clampYear2100(addDays(weekStart, -7));
    setWeekAnchor(startOfWeekSunday(prev));
  }

  function gotoNextWeek() {
    const next = clampYear2100(addDays(weekStart, 7));
    setWeekAnchor(startOfWeekSunday(next));
  }

  const weekLabel = useMemo(() => {
    const end = addDays(weekStart, 6);
    return `${prettyMD(weekStart)} – ${prettyMD(end)}, ${end.getFullYear()}`;
  }, [weekStart]);

  const [todayISO, setTodayISO] = useState<string>("");

  useEffect(() => {
    const now = new Date();
    setTodayISO(toISODate(now)); // user’s computer time
  }, []);

  return (
    <div className="min-h-screen bg-background text-text">
      <Head>
        <title>Todo Calendar</title>
      </Head>
      <NavBar />
      <div className="flex flex-col mx-auto items-center px-4 py-6">
        {errMsg ? (
          <div className="mb-4 w-[95dvw] rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-text">
            {errMsg}
          </div>
        ) : null}

        {/* Box: header left, nav right, then grid */}
        <div className="w-[95dvw] rounded-2xl border border-primary/20 bg-secondary/50 p-3 sm:p-4">
          {/* Header: Weekly Tasks + date on left, < Today > on right */}
          <div className="mb-4 flex flex-row items-center justify-between gap-4">
            <div className="min-w-0 flex flex-col">
              <h1 className="text-xl font-semibold text-text">Weekly Tasks</h1>
              <p className="mt-1 text-sm text-text/75">{weekLabel}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <PageColorPicker />
              <button
                onClick={gotoPrevWeek}
                className="rounded-xl border border-primary/40 px-3 py-2 text-sm text-text hover:bg-primary/20 transition"
                type="button"
              >
                ←
              </button>
              <button
                onClick={() =>
                  setWeekAnchor(startOfWeekSunday(clampYear2100(new Date())))
                }
                className="rounded-xl border border-primary/40 px-3 py-2 text-sm text-text hover:bg-primary/20 transition"
                type="button"
              >
                Today
              </button>
              <button
                onClick={gotoNextWeek}
                className="rounded-xl border border-primary/40 px-3 py-2 text-sm text-text hover:bg-primary/20 transition"
                type="button"
              >
                →
              </button>
            </div>
          </div>

          {/* Grid */}
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={(e: { active: { id: string | number } }) =>
              handleDragStart(e.active.id)
            }
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
              {weekDays.map((day) => {
                const dayISO = toISODate(day);
                const dayTodos = todosByDay.get(dayISO) ?? [];
                const containerId = dayIdFromISO(dayISO);

                return (
                  <div
                    key={dayISO}
                    className="flex min-h-[220px] flex-col rounded-2xl border border-primary/20 bg-secondary/40"
                  >
                    {/* Day header */}
                    <div
                      className={`${
                        todayISO && dayISO === todayISO ? "bg-primary/40" : ""
                      }  flex items-center justify-between rounded-t-2xl gap-2 border-b border-primary/20 px-3 py-2`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs tracking-wide text-text/70 normal-case">
                          {prettyDow(day)}
                        </div>
                        <div className="truncate font-medium text-text">
                          {prettyMD(day)}
                        </div>
                        <div className="text-xs text-text/60">{dayISO}</div>
                      </div>
                    </div>

                    {/* Day body */}
                    <div className="flex-1 p-3">
                      <SortableContext
                        items={[
                          containerId,
                          ...dayTodos.map((t) => `todo:${t.id}`),
                        ]}
                        strategy={verticalListSortingStrategy}
                      >
                        <DroppableDayBody
                          id={containerId}
                          className={[
                            "flex flex-col gap-2",
                            "min-h-[160px] rounded-xl",
                            "p-2 -m-2",
                            "transition",
                          ].join(" ")}
                        >
                          {dayTodos.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-primary/30 px-3 py-6 text-center text-sm text-text/60">
                              Drop tasks here
                            </div>
                          ) : null}

                          {dayTodos.map((t) => (
                            <SortableTodoCard
                              key={t.id}
                              todo={t}
                              onEdit={openEdit}
                              onDelete={deleteTodo}
                              onComplete={toggleComplete}
                            />
                          ))}

                          <button
                            onClick={() => openCreate(dayISO)}
                            className="shrink-0 rounded-xl border border-dashed border-primary/40 px-2 py-2 text-sm text-text/70 transition hover:bg-primary/10 hover:text-text"
                            type="button"
                          >
                            + Add
                          </button>
                        </DroppableDayBody>
                      </SortableContext>
                    </div>
                  </div>
                );
              })}
            </div>

            <DragOverlay>
              {activeTodo ? <OverlayCard todo={activeTodo} /> : null}
            </DragOverlay>
          </DndContext>

          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-text/75">
            <div>
              {loading
                ? "Loading…"
                : `${
                    todos.filter((t) => !t.completed || showCompleted).length
                  } task(s) this week`}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="rounded-xl border border-primary/40 px-3 py-2 text-sm text-text hover:bg-primary/20 transition"
                type="button"
              >
                {showCompleted ? "Hide" : "Show"} Completed
              </button>
              <button
                onClick={loadWeek}
                className="rounded-xl border border-primary/40 px-3 py-2 text-sm text-text hover:bg-primary/20 transition"
                type="button"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit modal */}
      <Modal
        open={modalOpen}
        title={editing ? "Edit task" : "New task"}
        onClose={() => setModalOpen(false)}
      >
        <div className="space-y-4 min-w-0">
          <div className="space-y-2 min-w-0">
            <label className="block text-sm font-medium text-text">
              Task date*
            </label>
            <input
              type="date"
              value={modalDayISO}
              onChange={(e) => setModalDayISO(e.target.value)}
              className="w-[100dvw] min-w-0 max-w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
              min="1900-01-01"
              max="2100-12-31"
            />
          </div>

          <div className="space-y-2 min-w-0">
            <label className="block text-sm font-medium text-text">
              Title*
            </label>
            <input
              value={draft.title}
              onChange={(e) =>
                setDraft((p) => ({ ...p, title: e.target.value }))
              }
              className="w-full min-w-0 max-w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="What needs doing?"
            />
          </div>

          <div className="space-y-2 min-w-0">
            <label className="block text-sm font-medium text-text">
              Details
            </label>
            <textarea
              value={draft.content}
              onChange={(e) =>
                setDraft((p) => ({ ...p, content: e.target.value }))
              }
              className="min-h-[90px] w-full min-w-0 max-w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Notes…"
            />
          </div>

          <div className="space-y-2 min-w-0">
            <label className="block text-sm font-medium text-text">
              Due date
            </label>
            <input
              type="date"
              value={draft.due_date}
              onChange={(e) =>
                setDraft((p) => ({ ...p, due_date: e.target.value }))
              }
              className="w-[100dvw] min-w-0 max-w-full rounded-xl border border-primary/30 bg-background px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/40"
              min="1900-01-01"
              max="2100-12-31"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-primary/40 px-4 py-2 text-sm text-text transition hover:bg-primary/20"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={saveTodo}
              disabled={saving || !draft.title.trim()}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-reverse disabled:opacity/50"
              type="button"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/**
 * Notes / recommended DB constraints (optional but strongly recommended):
 * - Enforce unique priority within a day so ordering stays consistent:
 *     create unique index todos_task_date_priority_key on public.todos(task_date, priority);
 *
 * - If you enable RLS in Supabase, add policies for selecting/inserting/updating/deleting.
 */
