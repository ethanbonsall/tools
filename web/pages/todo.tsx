/* eslint-disable @typescript-eslint/no-explicit-any */

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
import Head from "next/head";
import { Minus } from "lucide-react";
import AppNav from "@/components/tools/AppNav";
import { useAppearance } from "@/context/themecontext";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/lib/auth";

type TodoRow = {
  id: number;
  created_at: string;
  task_date: string | null;
  priority: number;
  due_date: string | null;
  title: string;
  content: string | null;
  user_id: string;
  completed: boolean;
};

const BACKLOG_ID = "day:backlog";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fromISODate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfWeekSunday(d: Date) {
  const dt = new Date(d);
  const day = dt.getDay();
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

function sortByPriority(items: TodoRow[]) {
  return [...items].sort((a, b) => a.priority - b.priority);
}

function withReprioritized(items: TodoRow[]) {
  return items.map((t, i) => ({ ...t, priority: i + 1 }));
}

function dayIdFromISO(iso: string) {
  return `day:${iso}`;
}

function isDayId(id: string) {
  return id.startsWith("day:");
}

function isoFromDayId(dayId: string) {
  return dayId.replace("day:", "");
}

function DroppableDayBody({
  id,
  children,
  className,
  onClick,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={[className, isOver ? "bg-mint/10" : ""].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
}

type DraftTodo = {
  title: string;
  content: string;
  due_date: string;
  undated: boolean;
};

function SortableTodoCard({
  todo,
  onEdit,
  onDelete,
  onComplete,
  onClearDate,
}: {
  todo: TodoRow;
  onEdit: (t: TodoRow) => void;
  onDelete: (t: TodoRow) => void;
  onComplete: (t: TodoRow) => void;
  onClearDate?: (t: TodoRow) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `todo:${todo.id}` });
  const [deleteHover, setDeleteHover] = useState(false);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "relative z-10 rounded-xl border p-3 shadow-sm transition",
        "cursor-grab active:cursor-grabbing",
        deleteHover
          ? "border-red-400 bg-red-50 shadow-none"
          : "border-line bg-surface hover:border-mint/40 hover:shadow",
        isDragging ? "opacity-50" : "",
      ].join(" ")}
      onClick={(e) => {
        e.stopPropagation();
        onEdit(todo);
      }}
      {...attributes}
      {...listeners}
    >
      <div className="relative z-20 flex w-full flex-row justify-between gap-1">
        <button
          className={[
            "flex h-6 w-6 items-center justify-center rounded-md text-base leading-none transition",
            deleteHover
              ? "bg-red-100 text-red-600"
              : "text-muted hover:bg-red-100 hover:text-red-600",
          ].join(" ")}
          onMouseEnter={() => setDeleteHover(true)}
          onMouseLeave={() => setDeleteHover(false)}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(todo);
          }}
          type="button"
          aria-label="Delete"
        >
          ×
        </button>
        <div className="flex items-center gap-0.5">
          {onClearDate && todo.task_date ? (
            <button
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition hover:bg-line hover:text-ink"
              onClick={(e) => {
                e.stopPropagation();
                onClearDate(todo);
              }}
              type="button"
              aria-label="Remove date"
            >
              <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          ) : null}
          <button
            className="flex h-6 w-6 items-center justify-center rounded-md text-sm leading-none text-muted transition hover:bg-mint-soft hover:text-mint"
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
      </div>

      <div className="mt-2 min-w-0 text-left">
        <span
          className={`line-clamp-1 text-xs font-medium text-ink ${
            todo.completed ? "line-through" : ""
          }`}
        >
          {todo.title}
        </span>
        {todo.due_date ? (
          <span
            className={`mt-1 block text-xs text-muted ${
              todo.completed ? "line-through" : ""
            }`}
          >
            Due {todo.due_date}
          </span>
        ) : null}
        {todo.content ? (
          <p
            className={`mt-1 line-clamp-4 whitespace-pre-line text-xs text-muted ${
              todo.completed ? "line-through" : ""
            }`}
          >
            {todo.content}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function OverlayCard({ todo }: { todo: TodoRow }) {
  return (
    <div className="w-[260px] rounded-xl border border-mint/30 bg-surface p-3 shadow-lg">
      <div className="truncate text-sm font-medium text-ink">{todo.title}</div>
      {todo.due_date ? (
        <div className="mt-1 text-xs text-muted">due {todo.due_date}</div>
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
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-[min(92vw,28rem)] flex-col rounded-2xl border border-line bg-surface shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
          <div className="truncate font-semibold text-ink">{title}</div>
          <button
            onClick={onClose}
            className="rounded-lg border border-line px-2 py-1 text-sm text-muted hover:bg-paper"
            type="button"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

export default function WeekTodoCalendarPage() {
  const { userId, loading: authLoading } = useRequireAuth();
  const { appearance } = useAppearance();
  const mobileStacked = appearance.mobile;
  const desktopSideBySide = appearance.desktop;
  const [showCompleted, setShowCompleted] = useState(false);

  const [weekAnchor, setWeekAnchor] = useState<Date>(() =>
    startOfWeekSunday(clampYear2100(new Date()))
  );

  const weekStart = useMemo(() => startOfWeekSunday(weekAnchor), [weekAnchor]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const rangeStartISO = useMemo(() => toISODate(weekStart), [weekStart]);
  const rangeEndISOExclusive = useMemo(
    () => toISODate(addDays(weekStart, 7)),
    [weekStart]
  );

  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [backlog, setBacklog] = useState<TodoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDayISO, setModalDayISO] = useState<string>(rangeStartISO);
  const [editing, setEditing] = useState<TodoRow | null>(null);
  const [draft, setDraft] = useState<DraftTodo>({
    title: "",
    content: "",
    due_date: "",
    undated: false,
  });
  const [saving, setSaving] = useState(false);
  const [activeTodo, setActiveTodo] = useState<TodoRow | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const allTodos = useMemo(() => [...todos, ...backlog], [todos, backlog]);

  const todosByDay = useMemo(() => {
    const map = new Map<string, TodoRow[]>();
    for (const day of weekDays) map.set(toISODate(day), []);
    for (const t of todos) {
      if (!t.task_date || !map.has(t.task_date)) continue;
      if (!showCompleted && t.completed) continue;
      map.get(t.task_date)!.push(t);
    }
    for (const [k, v] of map) map.set(k, sortByPriority(v));
    return map;
  }, [todos, weekDays, showCompleted]);

  const visibleBacklog = useMemo(
    () =>
      sortByPriority(
        backlog.filter((t) => showCompleted || !t.completed)
      ),
    [backlog, showCompleted]
  );

  async function loadData() {
    if (!userId) return;
    setLoading(true);
    setErrMsg(null);
    try {
      const [weekRes, backlogRes] = await Promise.all([
        supabase
          .from("todos")
          .select(
            "id,created_at,task_date,priority,due_date,title,content,user_id,completed"
          )
          .eq("user_id", userId)
          .gte("task_date", rangeStartISO)
          .lt("task_date", rangeEndISOExclusive)
          .order("task_date", { ascending: true })
          .order("priority", { ascending: true }),
        supabase
          .from("todos")
          .select(
            "id,created_at,task_date,priority,due_date,title,content,user_id,completed"
          )
          .eq("user_id", userId)
          .is("task_date", null)
          .order("priority", { ascending: true }),
      ]);

      if (weekRes.error) throw weekRes.error;
      if (backlogRes.error) throw backlogRes.error;
      setTodos((weekRes.data ?? []) as TodoRow[]);
      setBacklog((backlogRes.data ?? []) as TodoRow[]);
    } catch (e: any) {
      setErrMsg(e?.message ?? "Failed to load todos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (userId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStartISO, rangeEndISOExclusive, userId]);

  function openCreate(dayISO: string | null) {
    setEditing(null);
    setModalDayISO(dayISO ?? rangeStartISO);
    setDraft({
      title: "",
      content: "",
      due_date: "",
      undated: dayISO === null,
    });
    setModalOpen(true);
  }

  function openEdit(todo: TodoRow) {
    setEditing(todo);
    setModalDayISO(todo.task_date ?? rangeStartISO);
    setDraft({
      title: todo.title,
      content: todo.content ?? "",
      due_date: todo.due_date ?? "",
      undated: todo.task_date === null,
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
      const updater = (prev: TodoRow[]) =>
        prev.map((t) =>
          t.id === todo.id ? { ...t, completed: !t.completed } : t
        );
      if (todo.task_date === null) setBacklog(updater);
      else setTodos(updater);
    } catch (e: any) {
      setErrMsg(e?.message ?? "Failed to toggle completion.");
      await loadData();
    }
  }

  async function persistDayPriorities(
    dayISO: string | null,
    dayTodos: TodoRow[]
  ) {
    for (const t of dayTodos) {
      const { error } = await supabase
        .from("todos")
        .update({ priority: t.priority, task_date: dayISO })
        .eq("id", t.id);
      if (error) throw error;
    }
  }

  async function clearDate(todo: TodoRow) {
    if (!todo.task_date) return;
    const fromDay = todo.task_date;
    const remaining = withReprioritized(
      (todosByDay.get(fromDay) ?? []).filter((t) => t.id !== todo.id)
    );
    const moved: TodoRow = {
      ...todo,
      task_date: null,
      priority: visibleBacklog.length + 1,
    };

    setTodos((prev) =>
      prev
        .filter((t) => t.id !== todo.id)
        .map((t) => {
          if (t.task_date !== fromDay) return t;
          const found = remaining.find((x) => x.id === t.id);
          return found ? { ...t, priority: found.priority } : t;
        })
    );
    setBacklog((prev) => [...prev, moved]);

    try {
      await persistDayPriorities(fromDay, remaining);
      await supabase
        .from("todos")
        .update({ task_date: null, priority: moved.priority })
        .eq("id", todo.id);
    } catch (e: any) {
      setErrMsg(e?.message ?? "Failed to move to backlog.");
      await loadData();
    }
  }

  async function saveTodo() {
    if (!userId) {
      setErrMsg("Please log in to create tasks.");
      return;
    }
    const title = draft.title.trim();
    if (!title) return;

    const taskDate = draft.undated ? null : modalDayISO;
    if (taskDate) {
      const day = fromISODate(taskDate);
      if (day.getFullYear() > 2100) return;
    }

    setSaving(true);
    setErrMsg(null);

    try {
      if (editing) {
        const patch = {
          title,
          content: draft.content.trim() ? draft.content.trim() : null,
          due_date: draft.due_date ? draft.due_date : null,
          task_date: taskDate,
          priority: editing.priority,
        };

        if (taskDate === null) {
          patch.priority = backlog.length + (editing.task_date === null ? 0 : 1);
        } else if (editing.task_date !== taskDate) {
          const target = todosByDay.get(taskDate) ?? [];
          patch.priority = target.length + 1;
        }

        const { error } = await supabase
          .from("todos")
          .update(patch)
          .eq("id", editing.id);
        if (error) throw error;
        await loadData();
      } else {
        const nextPriority =
          taskDate === null
            ? backlog.length + 1
            : (todosByDay.get(taskDate) ?? []).length + 1;

        const insertRow = {
          task_date: taskDate,
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
        if (data) {
          const row = data as TodoRow;
          if (row.task_date === null) setBacklog((prev) => [...prev, row]);
          else setTodos((prev) => [...prev, row]);
        }
      }

      setModalOpen(false);
    } catch (e: any) {
      setErrMsg(e?.message ?? "Save failed.");
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function deleteTodo(todo: TodoRow) {
    try {
      const { error } = await supabase.from("todos").delete().eq("id", todo.id);
      if (error) throw error;
      if (todo.task_date === null) {
        setBacklog((prev) => prev.filter((t) => t.id !== todo.id));
      } else {
        setTodos((prev) => prev.filter((t) => t.id !== todo.id));
      }
    } catch (e: any) {
      setErrMsg(e?.message ?? "Delete failed.");
      await loadData();
    }
  }

  function findTodoByDnDId(id: string | number): TodoRow | null {
    const s = String(id);
    if (!s.startsWith("todo:")) return null;
    const tid = Number(s.replace("todo:", ""));
    return allTodos.find((t) => t.id === tid) ?? null;
  }

  function findContainerKey(overId: string | number): string | null {
    const s = String(overId);
    if (isDayId(s)) return isoFromDayId(s);
    if (s.startsWith("todo:")) {
      const t = findTodoByDnDId(s);
      if (!t) return null;
      return t.task_date ?? "backlog";
    }
    return null;
  }

  function listForKey(key: string): TodoRow[] {
    if (key === "backlog") return sortByPriority(visibleBacklog);
    return sortByPriority(todosByDay.get(key) ?? []);
  }

  function applyPriorities(
    prev: TodoRow[],
    dayKey: string | null,
    ordered: TodoRow[]
  ) {
    const priorityMap = new Map(ordered.map((t) => [t.id, t.priority]));
    return prev.map((t) => {
      const matches =
        dayKey === null ? t.task_date === null : t.task_date === dayKey;
      if (!matches || !priorityMap.has(t.id)) return t;
      return { ...t, priority: priorityMap.get(t.id)! };
    });
  }

  async function handleDragEnd(evt: DragEndEvent) {
    const { active, over } = evt;
    setActiveTodo(null);
    if (!over) return;

    const dragged = findTodoByDnDId(active.id);
    if (!dragged) return;

    const fromKey = dragged.task_date ?? "backlog";
    const toKey = findContainerKey(over.id);
    if (!toKey) return;

    const fromList = listForKey(fromKey);
    const toList = listForKey(toKey);

    if (fromKey === toKey) {
      const oldIndex = fromList.findIndex((t) => t.id === dragged.id);
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
        newIndex = fromList.length - 1;
      }
      if (oldIndex === newIndex) return;
      const moved = withReprioritized(arrayMove(fromList, oldIndex, newIndex));
      const dayISO = fromKey === "backlog" ? null : fromKey;
      if (fromKey === "backlog") {
        setBacklog((prev) => applyPriorities(prev, null, moved));
      } else {
        setTodos((prev) => applyPriorities(prev, fromKey, moved));
      }
      try {
        await persistDayPriorities(dayISO, moved);
      } catch (e: any) {
        setErrMsg(e?.message ?? "Reorder failed.");
        await loadData();
      }
      return;
    }

    const overStr = String(over.id);
    let insertIndex = toList.length;
    if (overStr.startsWith("todo:")) {
      const overTodo = findTodoByDnDId(overStr);
      if (overTodo) {
        const idx = toList.findIndex((t) => t.id === overTodo.id);
        insertIndex = idx === -1 ? toList.length : idx;
      }
    }

    const toDate = toKey === "backlog" ? null : toKey;
    const movingTodo: TodoRow = { ...dragged, task_date: toDate };
    const newFrom = withReprioritized(
      fromList.filter((t) => t.id !== dragged.id)
    );
    const toWithout = toList.filter((t) => t.id !== dragged.id);
    const newTo = withReprioritized([
      ...toWithout.slice(0, insertIndex),
      movingTodo,
      ...toWithout.slice(insertIndex),
    ]).map((t) => ({ ...t, task_date: toDate }));

    // Optimistic UI — update both containers before persisting
    if (fromKey === "backlog") {
      setBacklog((prev) =>
        applyPriorities(
          prev.filter((t) => t.id !== dragged.id),
          null,
          newFrom
        )
      );
    } else {
      setTodos((prev) =>
        applyPriorities(
          prev.filter((t) => t.id !== dragged.id),
          fromKey,
          newFrom
        )
      );
    }

    if (toKey === "backlog") {
      setBacklog((prev) => {
        const without = prev.filter((t) => t.id !== dragged.id);
        const prioritized = applyPriorities(without, null, newTo);
        const existingIds = new Set(prioritized.map((t) => t.id));
        const additions = newTo.filter((t) => !existingIds.has(t.id));
        return [...prioritized, ...additions];
      });
    } else {
      setTodos((prev) => {
        const without = prev.filter((t) => t.id !== dragged.id);
        const prioritized = applyPriorities(without, toKey, newTo);
        const existingIds = new Set(prioritized.map((t) => t.id));
        const additions = newTo.filter((t) => !existingIds.has(t.id));
        return [...prioritized, ...additions];
      });
    }

    try {
      await persistDayPriorities(
        fromKey === "backlog" ? null : fromKey,
        newFrom
      );
      await persistDayPriorities(toDate, newTo);
    } catch (e: any) {
      setErrMsg(e?.message ?? "Move failed.");
      await loadData();
    }
  }

  const [todayISO, setTodayISO] = useState("");
  useEffect(() => {
    setTodayISO(toISODate(new Date()));
  }, []);

  const weekLabel = useMemo(() => {
    const end = addDays(weekStart, 6);
    return `${prettyMD(weekStart)} – ${prettyMD(end)}, ${end.getFullYear()}`;
  }, [weekStart]);

  if (authLoading) {
    return (
      <div className="dashboard-shell flex min-h-screen items-center justify-center text-muted">
        …
      </div>
    );
  }

  return (
    <div className="dashboard-shell pb-24 text-ink md:pb-10">
      <Head>
        <title>Todo · Ethan&apos;s Tools</title>
      </Head>
      <AppNav />
      <div className="mx-auto flex w-full max-w-none flex-col px-5 py-6 sm:px-6 lg:px-8">
        {errMsg ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errMsg}
          </div>
        ) : null}

        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={(e) => {
            const t = findTodoByDnDId(e.active.id);
            if (t) setActiveTodo(t);
          }}
          onDragEnd={handleDragEnd}
        >
          <div className="mb-4 flex flex-row items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-xl font-semibold">Weekly Tasks</h1>
              <p className="mt-1 text-sm text-muted">{weekLabel}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() =>
                  setWeekAnchor(
                    startOfWeekSunday(clampYear2100(addDays(weekStart, -7)))
                  )
                }
                className="rounded-xl border border-line bg-surface px-3 py-2 text-sm hover:bg-paper"
                type="button"
              >
                ←
              </button>
              <button
                onClick={() =>
                  setWeekAnchor(startOfWeekSunday(clampYear2100(new Date())))
                }
                className="rounded-xl border border-line bg-surface px-3 py-2 text-sm hover:bg-paper"
                type="button"
              >
                Today
              </button>
              <button
                onClick={() =>
                  setWeekAnchor(
                    startOfWeekSunday(clampYear2100(addDays(weekStart, 7)))
                  )
                }
                className="rounded-xl border border-line bg-surface px-3 py-2 text-sm hover:bg-paper"
                type="button"
              >
                →
              </button>
            </div>
          </div>

          <div
            className={[
              mobileStacked ? "" : "overflow-x-auto pb-1",
              desktopSideBySide ? "md:overflow-visible md:pb-0" : "md:overflow-x-auto md:pb-1",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div
              className={[
                mobileStacked
                  ? "flex flex-col gap-3"
                  : "grid min-w-[980px] grid-cols-7 gap-2.5",
                desktopSideBySide
                  ? "md:grid md:min-w-0 md:grid-cols-7 md:gap-2.5"
                  : "md:grid md:min-w-[980px] md:grid-cols-7 md:gap-2.5",
              ].join(" ")}
            >
              {weekDays.map((day) => {
                const dayISO = toISODate(day);
                const dayTodos = todosByDay.get(dayISO) ?? [];
                const containerId = dayIdFromISO(dayISO);

                return (
                  <div
                    key={dayISO}
                    className={[
                      "flex flex-col rounded-2xl border border-line bg-surface",
                      mobileStacked ? "min-h-[140px]" : "min-h-[240px]",
                      "md:min-h-[240px]",
                    ].join(" ")}
                  >
                    <div
                      className={`${
                        todayISO && dayISO === todayISO ? "bg-mint-soft" : ""
                      } flex items-center justify-between gap-2 rounded-t-2xl border-b border-line px-3 py-2`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs tracking-wide text-muted">
                          {prettyDow(day)}
                        </div>
                        <div className="truncate font-medium">{prettyMD(day)}</div>
                      </div>
                    </div>
                    <div
                      className="flex flex-1 cursor-pointer flex-col rounded-b-2xl p-2.5 transition hover:bg-mint/5"
                      onClick={() => openCreate(dayISO)}
                    >
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
                            "flex flex-1 flex-col gap-2 rounded-xl",
                            mobileStacked ? "min-h-[72px]" : "min-h-[180px]",
                            "md:min-h-[180px]",
                          ].join(" ")}
                        >
                          {dayTodos.length === 0 ? (
                            <div
                              className={[
                                "flex items-center justify-center rounded-xl border border-dashed border-line px-3 text-center text-sm text-muted",
                                mobileStacked ? "w-full py-5" : "flex-1 py-6",
                                "md:flex-1 md:py-6",
                              ].join(" ")}
                            >
                              Click or drop tasks
                            </div>
                          ) : null}
                          {dayTodos.map((t) => (
                            <SortableTodoCard
                              key={t.id}
                              todo={t}
                              onEdit={openEdit}
                              onDelete={deleteTodo}
                              onComplete={toggleComplete}
                              onClearDate={clearDate}
                            />
                          ))}
                        </DroppableDayBody>
                      </SortableContext>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted">
            <div>
              {loading
                ? "Loading…"
                : `${todos.filter((t) => !t.completed || showCompleted).length} this week · ${visibleBacklog.length} backlog`}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-sm hover:bg-paper"
                type="button"
              >
                {showCompleted ? "Hide" : "Show"} Completed
              </button>
              <button
                onClick={loadData}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-sm hover:bg-paper"
                type="button"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold">Backlog</h2>
              <button
                type="button"
                onClick={() => openCreate(null)}
                className="rounded-lg border border-dashed border-mint/50 px-2 py-1 text-xs text-mint hover:bg-mint-soft"
              >
                + Add
              </button>
            </div>
            <SortableContext
              items={[BACKLOG_ID, ...visibleBacklog.map((t) => `todo:${t.id}`)]}
              strategy={verticalListSortingStrategy}
            >
              <DroppableDayBody
                id={BACKLOG_ID}
                onClick={() => openCreate(null)}
                className="flex min-h-[100px] cursor-pointer flex-col gap-2 rounded-xl transition hover:bg-mint/5 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {visibleBacklog.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-line px-3 py-8 text-center text-xs text-muted sm:col-span-full">
                    Click or drop tasks
                  </div>
                ) : null}
                {visibleBacklog.map((t) => (
                  <SortableTodoCard
                    key={t.id}
                    todo={t}
                    onEdit={openEdit}
                    onDelete={deleteTodo}
                    onComplete={toggleComplete}
                  />
                ))}
              </DroppableDayBody>
            </SortableContext>
          </div>

          <DragOverlay>
            {activeTodo ? <OverlayCard todo={activeTodo} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? "Edit task" : "New task"}
        onClose={() => setModalOpen(false)}
      >
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={draft.undated}
              onChange={(e) =>
                setDraft((p) => ({ ...p, undated: e.target.checked }))
              }
            />
            Backlog
          </label>

          {!draft.undated ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Task date*</label>
              <input
                type="date"
                value={modalDayISO}
                onChange={(e) => setModalDayISO(e.target.value)}
                className="w-full rounded-xl border border-line bg-paper px-3 py-2 outline-none focus:ring-2 focus:ring-mint/40"
                min="1900-01-01"
                max="2100-12-31"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="block text-sm font-medium">Title*</label>
            <input
              value={draft.title}
              onChange={(e) =>
                setDraft((p) => ({ ...p, title: e.target.value }))
              }
              className="w-full rounded-xl border border-line bg-paper px-3 py-2 outline-none focus:ring-2 focus:ring-mint/40"
              placeholder="What needs doing?"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Details</label>
            <textarea
              value={draft.content}
              onChange={(e) =>
                setDraft((p) => ({ ...p, content: e.target.value }))
              }
              className="min-h-[90px] w-full rounded-xl border border-line bg-paper px-3 py-2 outline-none focus:ring-2 focus:ring-mint/40"
              placeholder="Notes…"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Due date</label>
            <input
              type="date"
              value={draft.due_date}
              onChange={(e) =>
                setDraft((p) => ({ ...p, due_date: e.target.value }))
              }
              className="w-full rounded-xl border border-line bg-paper px-3 py-2 outline-none focus:ring-2 focus:ring-mint/40"
              min="1900-01-01"
              max="2100-12-31"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-line px-4 py-2 text-sm hover:bg-paper"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={saveTodo}
              disabled={saving || !draft.title.trim()}
              className="rounded-xl bg-mint px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50"
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
