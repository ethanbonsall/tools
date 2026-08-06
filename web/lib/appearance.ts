/** Default appearance: black canvas, soft white text, mint accent for outlines/highlights */
export const DEFAULT_APPEARANCE = {
  background: "#0a0a0a",
  accent: "#5eead4",
  text: "#f4f4f5",
  /** true = stacked days on mobile; false = horizontal scroll */
  mobile: true,
  /** true = side-by-side days on desktop; false = horizontal scroll */
  desktop: true,
};

export type Appearance = {
  background: string;
  accent: string;
  text: string;
  mobile: boolean;
  desktop: boolean;
};

export type UserAppearanceRow = {
  color?: string | null;
  text?: string | null;
  accent?: string | null;
  mobile?: boolean | null;
  desktop?: boolean | null;
};

const STORAGE_KEY = "ethans-tools-appearance";

function asBool(v: unknown, fallback: boolean) {
  if (typeof v === "boolean") return v;
  return fallback;
}

export function appearanceFromRow(row: UserAppearanceRow | null | undefined): Appearance {
  if (!row) return { ...DEFAULT_APPEARANCE };
  return {
    background: row.color || DEFAULT_APPEARANCE.background,
    text: row.text || DEFAULT_APPEARANCE.text,
    accent: row.accent || DEFAULT_APPEARANCE.accent,
    mobile: asBool(row.mobile, DEFAULT_APPEARANCE.mobile),
    desktop: asBool(row.desktop, DEFAULT_APPEARANCE.desktop),
  };
}

export function appearanceToRow(a: Appearance): UserAppearanceRow {
  return {
    color: a.background,
    text: a.text,
    accent: a.accent,
    mobile: a.mobile,
    desktop: a.desktop,
  };
}

export function loadAppearance(): Appearance {
  if (typeof window === "undefined") return { ...DEFAULT_APPEARANCE };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_APPEARANCE };
    const parsed = JSON.parse(raw) as Partial<Appearance> & {
      todoWeekLayout?: string;
    };
    // Migrate old single-layout preference
    let mobile = asBool(parsed.mobile, DEFAULT_APPEARANCE.mobile);
    let desktop = asBool(parsed.desktop, DEFAULT_APPEARANCE.desktop);
    if (parsed.todoWeekLayout === "scroll") {
      mobile = false;
      desktop = false;
    } else if (parsed.todoWeekLayout === "adaptive" || parsed.todoWeekLayout === "stacked") {
      mobile = true;
      desktop = true;
    }
    return {
      background: parsed.background || DEFAULT_APPEARANCE.background,
      accent: parsed.accent || DEFAULT_APPEARANCE.accent,
      text: parsed.text || DEFAULT_APPEARANCE.text,
      mobile,
      desktop,
    };
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function saveAppearance(a: Appearance) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
}

/** Convert #RRGGBB to "H S% L%" for hsl(var(--x) / alpha) */
export function hexToHslChannels(hex: string): string {
  const cleaned = hex.replace("#", "").trim();
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;
  const n = parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) return "0 0% 4%";
  let r = ((n >> 16) & 255) / 255;
  let g = ((n >> 8) & 255) / 255;
  let b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function mixToward(hex: string, towardWhite: boolean, amount: number): string {
  const cleaned = hex.replace("#", "");
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return hex;
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const t = towardWhite ? 255 : 0;
  r = Math.round(r + (t - r) * amount);
  g = Math.round(g + (t - g) * amount);
  b = Math.round(b + (t - b) * amount);
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

export function applyAppearance(a: Appearance) {
  const root = document.documentElement;
  const bg = hexToHslChannels(a.background);
  const accent = hexToHslChannels(a.accent);
  const text = hexToHslChannels(a.text);
  const surfaceHex = mixToward(a.background, true, 0.06);
  const lineHex = mixToward(a.text, false, 0.65);
  const mutedHex = mixToward(a.text, false, 0.35);
  const softHex = mixToward(a.accent, false, 0.75);

  root.style.setProperty("--paper", bg);
  root.style.setProperty("--background", bg);
  root.style.setProperty("--ink", text);
  root.style.setProperty("--text", text);
  root.style.setProperty("--mint", accent);
  root.style.setProperty("--primary", accent);
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--pop", accent);
  root.style.setProperty("--surface", hexToHslChannels(surfaceHex));
  root.style.setProperty("--secondary", hexToHslChannels(surfaceHex));
  root.style.setProperty("--line", hexToHslChannels(lineHex));
  root.style.setProperty("--muted", hexToHslChannels(mutedHex));
  root.style.setProperty("--mint-soft", hexToHslChannels(softHex));
  root.style.setProperty("--reverse", bg);
  root.style.setProperty("--scroll", a.accent + "66");
  root.style.setProperty("color-scheme", "dark");
}
