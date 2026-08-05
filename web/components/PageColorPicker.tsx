"use client";

import React, { useEffect, useRef, useState } from "react";
import { Palette, RotateCcw } from "lucide-react";

type PageColors = {
  background: string;
  accent: string;
};

const STORAGE_KEY = "page-color-preferences";
const DEFAULT_COLORS: PageColors = {
  background: "#0a0a0a",
  accent: "#14b8a6",
};

function hexToHsl(hex: string) {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(
    l * 100
  )}%`;
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function parseStoredColors(value: string | null): PageColors {
  if (!value) return DEFAULT_COLORS;
  try {
    const parsed = JSON.parse(value) as Partial<PageColors> & {
      primary?: string;
    };
    return {
      background: isHexColor(parsed.background)
        ? parsed.background
        : isHexColor(parsed.primary)
        ? parsed.primary
        : DEFAULT_COLORS.background,
      accent: isHexColor(parsed.accent) ? parsed.accent : DEFAULT_COLORS.accent,
    };
  } catch {
    return DEFAULT_COLORS;
  }
}

function applyPageColors(colors: PageColors) {
  const root = document.documentElement;
  root.style.setProperty("--background", hexToHsl(colors.background));
  root.style.setProperty("--primary", hexToHsl(colors.accent));
  root.style.setProperty("--accent", hexToHsl(colors.accent));
  root.style.setProperty("--pop", hexToHsl(colors.accent));
  root.style.setProperty("--scroll", `${colors.accent}4d`);
}

function clearPageColors() {
  const root = document.documentElement;
  root.style.removeProperty("--background");
  root.style.removeProperty("--primary");
  root.style.removeProperty("--accent");
  root.style.removeProperty("--pop");
  root.style.removeProperty("--scroll");
}

export default function PageColorPicker() {
  const [colors, setColors] = useState<PageColors>(DEFAULT_COLORS);
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const storedColors = parseStoredColors(
      window.localStorage.getItem(STORAGE_KEY)
    );
    setColors(storedColors);
    applyPageColors(storedColors);

    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      const nextColors = parseStoredColors(event.newValue);
      setColors(nextColors);
      applyPageColors(nextColors);
    }

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      clearPageColors();
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (
        pickerRef.current &&
        event.target instanceof Node &&
        !pickerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [open]);

  function commitColors(nextColors: PageColors) {
    setColors(nextColors);
    applyPageColors(nextColors);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextColors));
  }

  function updateColor(key: keyof PageColors, value: string) {
    if (!isHexColor(value)) return;
    setColors((currentColors) => {
      const nextColors = { ...currentColors, [key]: value };
      applyPageColors(nextColors);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextColors));
      return nextColors;
    });
  }

  function resetColors() {
    commitColors(DEFAULT_COLORS);
  }

  return (
    <div ref={pickerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-background text-primary transition hover:bg-primary/15 focus:outline-none focus:ring-2 focus:ring-primary/40"
        aria-label="Choose page colors"
        title="Choose page colors"
      >
        <Palette className="h-5 w-5" aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-40 w-56 rounded-xl border border-primary/30 bg-background p-3 shadow-xl shadow-primary/10">
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3 text-sm text-text">
              <span>Color</span>
              <input
                type="color"
                value={colors.background}
                onChange={(event) =>
                  updateColor("background", event.target.value)
                }
                onInput={(event) =>
                  updateColor("background", event.currentTarget.value)
                }
                onBlur={(event) =>
                  updateColor("background", event.currentTarget.value)
                }
                className="h-9 w-12 cursor-pointer rounded border border-primary/30 bg-transparent p-0.5"
                aria-label="Background color"
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm text-text">
              <span>Accent</span>
              <input
                type="color"
                value={colors.accent}
                onChange={(event) => updateColor("accent", event.target.value)}
                onInput={(event) =>
                  updateColor("accent", event.currentTarget.value)
                }
                onBlur={(event) =>
                  updateColor("accent", event.currentTarget.value)
                }
                className="h-9 w-12 cursor-pointer rounded border border-primary/30 bg-transparent p-0.5"
                aria-label="Accent color"
              />
            </label>
            <button
              type="button"
              onClick={resetColors}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 px-3 py-2 text-sm text-text transition hover:bg-primary/15"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
