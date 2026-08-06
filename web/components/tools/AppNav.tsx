import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/router";
import { motion, useMotionValue, animate } from "framer-motion";
import { HeartPulse, LayoutGrid, ListTodo, User, Wallet } from "lucide-react";

const LINKS = [
  { href: "/app", label: "Home", icon: LayoutGrid },
  { href: "/todo", label: "Todo", icon: ListTodo },
  { href: "/finances", label: "Money", icon: Wallet },
  { href: "/health", label: "Health", icon: HeartPulse },
] as const;

type Slot = { x: number; width: number; height: number; y: number };

function SlidingNav({
  pathname,
  className,
  size = "md",
  stretch = false,
}: {
  pathname: string;
  className?: string;
  size?: "sm" | "md";
  stretch?: boolean;
}) {
  const router = useRouter();
  const trackRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const pillX = useMotionValue(0);
  const pillW = useMotionValue(56);
  const [pillReady, setPillReady] = useState(false);
  const positionedRef = useRef(false);
  const prevPathRef = useRef(pathname);
  const skipPathAnimRef = useRef(false);

  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startPillXRef = useRef(0);
  const movedRef = useRef(false);
  const draggingRef = useRef(false);

  const activeIndex = Math.max(
    0,
    LINKS.findIndex((l) => l.href === pathname)
  );

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const trackRect = track.getBoundingClientRect();
    // Absolute children are positioned against the padding box; getBoundingClientRect
    // is the border box — subtract clientLeft/Top (border widths) so pill aligns.
    const originX = trackRect.left + track.clientLeft;
    const originY = trackRect.top + track.clientTop;
    const next: Slot[] = chipRefs.current.map((el) => {
      if (!el) return { x: 0, width: 0, height: 0, y: 0 };
      const r = el.getBoundingClientRect();
      return {
        x: r.left - originX,
        width: r.width,
        height: r.height,
        y: r.top - originY,
      };
    });
    setSlots(next);
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure, pathname, stretch, size]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  // Place pill: instant on first layout / resize; animate only on route change
  useLayoutEffect(() => {
    const slot = slots[activeIndex];
    if (!slot || slot.width === 0 || draggingRef.current) return;

    const pathChanged = prevPathRef.current !== pathname;
    prevPathRef.current = pathname;

    if (!positionedRef.current || !pathChanged) {
      pillX.set(slot.x);
      pillW.set(slot.width);
      positionedRef.current = true;
      setPillReady(true);
      return;
    }

    if (skipPathAnimRef.current) {
      skipPathAnimRef.current = false;
      return;
    }

    animate(pillX, slot.x, { type: "spring", stiffness: 500, damping: 38 });
    animate(pillW, slot.width, { type: "spring", stiffness: 500, damping: 38 });
  }, [activeIndex, slots, pathname, pillX, pillW]);

  const activeSlot = slots[activeIndex] ?? {
    x: 0,
    width: 56,
    height: 32,
    y: 4,
  };

  function nearestIndex(x: number, width: number) {
    if (!slots.length) return 0;
    const center = x + width / 2;
    let best = 0;
    let bestDist = Infinity;
    slots.forEach((s, i) => {
      const d = Math.abs(s.x + s.width / 2 - center);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }

  function navigateTo(i: number) {
    const clamped = Math.max(0, Math.min(LINKS.length - 1, i));
    const slot = slots[clamped];
    if (slot) {
      skipPathAnimRef.current = true;
      animate(pillX, slot.x, { type: "spring", stiffness: 500, damping: 38 });
      animate(pillW, slot.width, { type: "spring", stiffness: 500, damping: 38 });
    }
    if (LINKS[clamped].href !== pathname) {
      router.push(LINKS[clamped].href);
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    const track = trackRef.current;
    if (!track) return;
    pointerIdRef.current = e.pointerId;
    track.setPointerCapture(e.pointerId);
    startXRef.current = e.clientX;
    startPillXRef.current = pillX.get();
    movedRef.current = false;
    draggingRef.current = false;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (pointerIdRef.current !== e.pointerId) return;
    const dx = e.clientX - startXRef.current;
    if (!movedRef.current && Math.abs(dx) < 6) return;
    movedRef.current = true;
    draggingRef.current = true;

    const minX = slots[0]?.x ?? 0;
    const maxX = slots[slots.length - 1]?.x ?? 0;
    const next = Math.min(maxX, Math.max(minX, startPillXRef.current + dx));
    pillX.set(next);

    // Morph width toward nearest while dragging
    const idx = nearestIndex(next, pillW.get());
    if (slots[idx]) pillW.set(slots[idx].width);
  }

  function onPointerUp(e: React.PointerEvent) {
    if (pointerIdRef.current !== e.pointerId) return;
    const track = trackRef.current;
    track?.releasePointerCapture(e.pointerId);
    pointerIdRef.current = null;

    if (!movedRef.current) {
      // Tap: pick tab under finger
      const rect = track?.getBoundingClientRect();
      if (rect) {
        const localX = e.clientX - rect.left;
        let best = 0;
        let bestDist = Infinity;
        slots.forEach((s, i) => {
          const d = Math.abs(s.x + s.width / 2 - localX);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        });
        navigateTo(best);
      }
    } else {
      const idx = nearestIndex(pillX.get(), pillW.get());
      draggingRef.current = false;
      navigateTo(idx);
    }
    draggingRef.current = false;
  }

  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const labelClass = size === "sm" ? "text-xs" : "text-[11px]";
  const chipPad = size === "sm" ? "px-3 py-1.5" : "px-3.5 py-2";

  return (
    <div
      ref={trackRef}
      className={clsx(
        "relative flex touch-none select-none items-center gap-0.5 rounded-full border border-line/80 bg-surface/70 p-1 shadow-[inset_0_1px_0_hsl(var(--ink)/0.08)] backdrop-blur-xl",
        stretch ? "w-full" : "w-fit",
        className
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="tablist"
    >
      {pillReady && slots.length > 0 ? (
        <motion.div
          className="pointer-events-none absolute left-0 z-0 rounded-full bg-mint/30 shadow-[inset_0_0_0_1px_hsl(var(--mint)/0.45),0_2px_12px_hsl(var(--mint)/0.25)]"
          style={{
            top: activeSlot.y,
            height: activeSlot.height,
            x: pillX,
            width: pillW,
          }}
        />
      ) : null}

      {LINKS.map(({ href, label, icon: Icon }, i) => {
        const active = pathname === href;
        return (
          <div
            key={href}
            role="tab"
            aria-selected={active}
            className={clsx(
              "relative z-10 flex justify-center",
              stretch && "flex-1"
            )}
          >
            <span
              ref={(node) => {
                chipRefs.current[i] = node;
              }}
              className={clsx(
                "inline-flex items-center justify-center gap-1.5 rounded-full",
                chipPad,
                active ? "text-ink" : "text-muted"
              )}
            >
              <Icon className={iconClass} />
              <span className={clsx("font-medium tracking-wide", labelClass)}>
                {label}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function AppNav() {
  const pathname = useRouter().pathname;

  return (
    <>
      <header className="sticky top-0 z-50 w-full">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/app"
            className="font-display text-base font-bold tracking-tight text-ink sm:text-lg"
            draggable={false}
          >
            ET
          </Link>

          <div className="hidden md:block">
            <SlidingNav pathname={pathname} size="sm" />
          </div>

          <Link
            href="/profile"
            aria-label="Profile"
            draggable={false}
            className={clsx(
              "flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface/70 text-muted backdrop-blur-xl transition hover:text-ink",
              pathname === "/profile" && "text-mint ring-1 ring-mint/40"
            )}
          >
            <User className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="pointer-events-auto w-full max-w-md">
          <SlidingNav pathname={pathname} size="md" stretch />
        </div>
      </div>
    </>
  );
}
