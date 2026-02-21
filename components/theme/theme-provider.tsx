"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

// ─── Types ─────────────────────────────────────────────────────

type FontSize = "sm" | "md" | "lg";

export interface FontDefinition {
  id: string;
  name: string;
  /** CSS font-family stack */
  stack: string;
  /** Brief description of the font's character */
  description: string;
  /** Whether this requires loading from the already-bundled next/font variables */
  type: "bundled" | "system" | "custom";
}

export interface ThemeTokens {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  sidebar: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
  accentColor: string;
  selectionBg: string;
  selectionFg: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  /** Whether this theme is visually dark (controls Tailwind dark: variants) */
  mode: "light" | "dark";
  /** Preview swatch colors [background, primary, accent] */
  swatches: [string, string, string];
  tokens: ThemeTokens;
}

interface ThemeContextType {
  themeId: string;
  setThemeId: (id: string) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  fontId: string;
  setFontId: (id: string) => void;
  customFonts: FontDefinition[];
  addCustomFont: (url: string) => FontDefinition | null;
  removeCustomFont: (id: string) => void;
  currentTheme: ThemeDefinition;
  currentFont: FontDefinition;
  themes: ThemeDefinition[];
  fonts: FontDefinition[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEYS = {
  themeId: "study-doc:theme_id",
  fontSize: "study-doc:font_size",
  fontId: "study-doc:font_id",
  customFonts: "study-doc:custom_fonts",
};

// ─── Predefined Fonts ─────────────────────────────────────────
// Diverse set: serif, sans-serif, humanist, geometric, slab, system.
// Bundled fonts use the CSS variables set by next/font in layout.tsx.

export const FONTS: FontDefinition[] = [
  {
    id: "system",
    name: "System Default",
    stack: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    description: "Your OS native typeface",
    type: "system",
  },
  {
    id: "geist",
    name: "Geist",
    stack: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, sans-serif',
    description: "Clean geometric sans by Vercel",
    type: "bundled",
  },
  {
    id: "ibm-plex",
    name: "IBM Plex Sans",
    stack: 'var(--font-ibm-plex-sans), "IBM Plex Sans", sans-serif',
    description: "Humanist corporate with warmth",
    type: "bundled",
  },
  {
    id: "georgia",
    name: "Georgia",
    stack: 'Georgia, "Times New Roman", Times, serif',
    description: "Classic screen serif — editorial feel",
    type: "system",
  },
  {
    id: "palatino",
    name: "Palatino",
    stack: '"Palatino Linotype", Palatino, "Book Antiqua", serif',
    description: "Old-style calligraphic serif",
    type: "system",
  },
  {
    id: "charter",
    name: "Charter",
    stack: 'Charter, "Bitstream Charter", "Sitka Text", Cambria, serif',
    description: "Sturdy utilitarian serif — great for reading",
    type: "system",
  },
  {
    id: "avenir",
    name: "Avenir / Nunito",
    stack: '"Avenir Next", Avenir, "Nunito Sans", Montserrat, sans-serif',
    description: "Rounded geometric sans — friendly",
    type: "system",
  },
  {
    id: "literata",
    name: "Literata",
    stack: 'Literata, "Iowan Old Style", Palatino, serif',
    description: "Google Fonts variable serif — designed for reading",
    type: "system",
  },
  {
    id: "optima",
    name: "Optima / Candara",
    stack: 'Optima, Candara, "Noto Sans", sans-serif',
    description: "Humanist sans with flared strokes",
    type: "system",
  },
  {
    id: "courier",
    name: "Courier Prime",
    stack: '"Courier New", Courier, monospace',
    description: "Typewriter monospace — raw & mechanical",
    type: "system",
  },
];

export const DEFAULT_FONT_ID = "system";

function getFontById(id: string, customFonts: FontDefinition[] = []): FontDefinition {
  return [...FONTS, ...customFonts].find((f) => f.id === id) ?? FONTS[0];
}

/**
 * Parse a Google Fonts URL (link href or @import url) and extract the family name.
 * Supports URLs like:
 *   https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,200..900;1,200..900&display=swap
 *   https://fonts.googleapis.com/css?family=Merriweather:400,700
 */
function parseGoogleFontUrl(input: string): { family: string; url: string } | null {
  // Extract URL from <link> tag if pasted as full tag
  let url = input.trim();
  const hrefMatch = url.match(/href=["']([^"']+)["']/);
  if (hrefMatch) url = hrefMatch[1];
  // Extract URL from @import
  const importMatch = url.match(/url\(["']?([^"')]+)["']?\)/);
  if (importMatch) url = importMatch[1];

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("fonts.googleapis.com")) return null;
    const familyParam = parsed.searchParams.get("family");
    if (!familyParam) return null;
    // "Crimson+Pro:ital,wght@..." → "Crimson Pro"
    const family = familyParam.split(":")[0].replace(/\+/g, " ");
    return { family, url };
  } catch {
    return null;
  }
}

// ─── Predefined Themes ────────────────────────────────────────
// Each theme defines ALL CSS custom properties — surfaces, accents,
// borders, sidebar, selection. No separate light/dark split.

export const THEMES: ThemeDefinition[] = [
  // ── Light Themes ──────────────────────────────────────────
  {
    id: "paper",
    name: "Paper",
    description: "Warm parchment with slate ink",
    mode: "light",
    swatches: ["oklch(0.975 0.004 80)", "oklch(0.44 0.03 250)", "oklch(0.94 0.012 250)"],
    tokens: {
      background: "oklch(0.975 0.004 80)",
      foreground: "oklch(0.18 0.01 50)",
      card: "oklch(0.985 0.003 80)",
      cardForeground: "oklch(0.18 0.01 50)",
      popover: "oklch(0.985 0.003 80)",
      popoverForeground: "oklch(0.18 0.01 50)",
      primary: "oklch(0.44 0.03 250)",
      primaryForeground: "oklch(0.975 0.004 80)",
      secondary: "oklch(0.945 0.006 80)",
      secondaryForeground: "oklch(0.20 0.01 50)",
      muted: "oklch(0.945 0.006 80)",
      mutedForeground: "oklch(0.50 0.01 60)",
      accent: "oklch(0.94 0.012 250)",
      accentForeground: "oklch(0.18 0.01 50)",
      destructive: "oklch(0.55 0.18 25)",
      border: "oklch(0.895 0.006 75)",
      input: "oklch(0.895 0.006 75)",
      ring: "oklch(0.44 0.03 250)",
      sidebar: "oklch(0.965 0.003 75)",
      sidebarForeground: "oklch(0.30 0.01 50)",
      sidebarPrimary: "oklch(0.44 0.03 250)",
      sidebarPrimaryForeground: "oklch(0.975 0.004 80)",
      sidebarAccent: "oklch(0.935 0.005 75)",
      sidebarAccentForeground: "oklch(0.20 0.01 50)",
      sidebarBorder: "oklch(0.895 0.005 75)",
      sidebarRing: "oklch(0.44 0.03 250)",
      accentColor: "oklch(0.44 0.03 250)",
      selectionBg: "oklch(0.85 0.06 80)",
      selectionFg: "oklch(0.18 0.01 50)",
    },
  },
  {
    id: "sepia",
    name: "Sepia",
    description: "Aged manuscript with amber ink",
    mode: "light",
    swatches: ["oklch(0.965 0.012 70)", "oklch(0.48 0.06 60)", "oklch(0.93 0.018 65)"],
    tokens: {
      background: "oklch(0.965 0.012 70)",
      foreground: "oklch(0.20 0.015 45)",
      card: "oklch(0.975 0.010 72)",
      cardForeground: "oklch(0.20 0.015 45)",
      popover: "oklch(0.975 0.010 72)",
      popoverForeground: "oklch(0.20 0.015 45)",
      primary: "oklch(0.48 0.06 60)",
      primaryForeground: "oklch(0.975 0.006 70)",
      secondary: "oklch(0.94 0.012 70)",
      secondaryForeground: "oklch(0.22 0.015 50)",
      muted: "oklch(0.94 0.012 70)",
      mutedForeground: "oklch(0.52 0.015 55)",
      accent: "oklch(0.93 0.018 65)",
      accentForeground: "oklch(0.22 0.015 50)",
      destructive: "oklch(0.55 0.16 28)",
      border: "oklch(0.88 0.012 68)",
      input: "oklch(0.88 0.012 68)",
      ring: "oklch(0.48 0.06 60)",
      sidebar: "oklch(0.955 0.010 68)",
      sidebarForeground: "oklch(0.32 0.015 48)",
      sidebarPrimary: "oklch(0.48 0.06 60)",
      sidebarPrimaryForeground: "oklch(0.975 0.006 70)",
      sidebarAccent: "oklch(0.925 0.015 66)",
      sidebarAccentForeground: "oklch(0.22 0.015 50)",
      sidebarBorder: "oklch(0.88 0.010 66)",
      sidebarRing: "oklch(0.48 0.06 60)",
      accentColor: "oklch(0.48 0.06 60)",
      selectionBg: "oklch(0.82 0.06 65)",
      selectionFg: "oklch(0.20 0.015 45)",
    },
  },
  {
    id: "sage",
    name: "Sage",
    description: "Botanical green on soft cream",
    mode: "light",
    swatches: ["oklch(0.970 0.006 145)", "oklch(0.46 0.05 160)", "oklch(0.93 0.018 158)"],
    tokens: {
      background: "oklch(0.970 0.006 145)",
      foreground: "oklch(0.18 0.012 150)",
      card: "oklch(0.980 0.005 148)",
      cardForeground: "oklch(0.18 0.012 150)",
      popover: "oklch(0.980 0.005 148)",
      popoverForeground: "oklch(0.18 0.012 150)",
      primary: "oklch(0.46 0.05 160)",
      primaryForeground: "oklch(0.98 0.004 155)",
      secondary: "oklch(0.945 0.010 150)",
      secondaryForeground: "oklch(0.20 0.012 155)",
      muted: "oklch(0.945 0.010 150)",
      mutedForeground: "oklch(0.50 0.012 152)",
      accent: "oklch(0.93 0.018 158)",
      accentForeground: "oklch(0.20 0.012 155)",
      destructive: "oklch(0.55 0.16 25)",
      border: "oklch(0.89 0.008 148)",
      input: "oklch(0.89 0.008 148)",
      ring: "oklch(0.46 0.05 160)",
      sidebar: "oklch(0.960 0.005 143)",
      sidebarForeground: "oklch(0.30 0.012 150)",
      sidebarPrimary: "oklch(0.46 0.05 160)",
      sidebarPrimaryForeground: "oklch(0.98 0.004 155)",
      sidebarAccent: "oklch(0.93 0.015 155)",
      sidebarAccentForeground: "oklch(0.20 0.012 155)",
      sidebarBorder: "oklch(0.89 0.006 146)",
      sidebarRing: "oklch(0.46 0.05 160)",
      accentColor: "oklch(0.46 0.05 160)",
      selectionBg: "oklch(0.83 0.05 158)",
      selectionFg: "oklch(0.18 0.012 150)",
    },
  },

  // ── Dark Themes ───────────────────────────────────────────
  {
    id: "obsidian",
    name: "Obsidian",
    description: "The Obsidian app default — achromatic with purple accent",
    mode: "dark",
    swatches: ["oklch(0.22 0 0)", "oklch(0.60 0.19 288)", "oklch(0.27 0 0)"],
    tokens: {
      background: "oklch(0.22 0 0)",          // #1e1e1e — base-00
      foreground: "oklch(0.88 0 0)",           // #dadada — base-100
      card: "oklch(0.25 0 0)",                 // #262626 — base-20
      cardForeground: "oklch(0.88 0 0)",       // #dadada
      popover: "oklch(0.25 0 0)",              // #262626
      popoverForeground: "oklch(0.88 0 0)",    // #dadada
      primary: "oklch(0.60 0.19 288)",         // hsl(254,80%,68%) — Obsidian purple accent
      primaryForeground: "oklch(1 0 0)",       // white text on accent
      secondary: "oklch(0.27 0 0)",            // #2a2a2a — base-25
      secondaryForeground: "oklch(0.78 0 0)",  // #bababa — base-70
      muted: "oklch(0.27 0 0)",                // #2a2a2a
      mutedForeground: "oklch(0.50 0 0)",      // #666666 — base-50
      accent: "oklch(0.27 0 0)",               // #2a2a2a — base-25
      accentForeground: "oklch(0.88 0 0)",     // #dadada
      destructive: "oklch(0.60 0.20 25)",      // #fb464c — Obsidian red (dark)
      border: "oklch(0.31 0 0)",               // #363636 — base-30
      input: "oklch(0.31 0 0)",                // #363636
      ring: "oklch(0.60 0.19 288)",            // purple accent
      sidebar: "oklch(0.23 0 0)",              // #212121 — base-05
      sidebarForeground: "oklch(0.78 0 0)",    // #bababa — base-70
      sidebarPrimary: "oklch(0.60 0.19 288)",  // purple accent
      sidebarPrimaryForeground: "oklch(1 0 0)",
      sidebarAccent: "oklch(0.27 0 0)",        // #2a2a2a — base-25
      sidebarAccentForeground: "oklch(0.88 0 0)",
      sidebarBorder: "oklch(0.31 0 0)",        // #363636 — base-30
      sidebarRing: "oklch(0.60 0.19 288)",     // purple accent
      accentColor: "oklch(0.60 0.19 288)",     // purple accent
      selectionBg: "oklch(0.40 0.12 288)",     // muted purple selection
      selectionFg: "oklch(0.95 0 0)",          // near-white
    },
  },
  {
    id: "rose",
    name: "Rose",
    description: "Dusty pink on warm charcoal",
    mode: "dark",
    swatches: ["oklch(0.17 0.010 10)", "oklch(0.72 0.06 10)", "oklch(0.22 0.020 12)"],
    tokens: {
      background: "oklch(0.17 0.010 10)",
      foreground: "oklch(0.92 0.008 10)",
      card: "oklch(0.20 0.010 10)",
      cardForeground: "oklch(0.92 0.008 10)",
      popover: "oklch(0.20 0.010 10)",
      popoverForeground: "oklch(0.92 0.008 10)",
      primary: "oklch(0.72 0.06 10)",
      primaryForeground: "oklch(0.16 0.01 10)",
      secondary: "oklch(0.24 0.012 10)",
      secondaryForeground: "oklch(0.90 0.008 10)",
      muted: "oklch(0.24 0.012 10)",
      mutedForeground: "oklch(0.60 0.012 10)",
      accent: "oklch(0.22 0.020 12)",
      accentForeground: "oklch(0.90 0.008 10)",
      destructive: "oklch(0.60 0.18 20)",
      border: "oklch(1 0 0 / 8%)",
      input: "oklch(1 0 0 / 12%)",
      ring: "oklch(0.72 0.06 10)",
      sidebar: "oklch(0.19 0.010 10)",
      sidebarForeground: "oklch(0.82 0.008 10)",
      sidebarPrimary: "oklch(0.72 0.06 10)",
      sidebarPrimaryForeground: "oklch(0.16 0.01 10)",
      sidebarAccent: "oklch(0.22 0.020 12)",
      sidebarAccentForeground: "oklch(0.90 0.008 10)",
      sidebarBorder: "oklch(0.25 0.010 10)",
      sidebarRing: "oklch(0.72 0.06 10)",
      accentColor: "oklch(0.72 0.06 10)",
      selectionBg: "oklch(0.35 0.06 10)",
      selectionFg: "oklch(0.92 0.008 10)",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Deep indigo on dark navy",
    mode: "dark",
    swatches: ["oklch(0.14 0.015 275)", "oklch(0.65 0.08 280)", "oklch(0.20 0.025 278)"],
    tokens: {
      background: "oklch(0.14 0.015 275)",
      foreground: "oklch(0.92 0.008 275)",
      card: "oklch(0.17 0.015 275)",
      cardForeground: "oklch(0.92 0.008 275)",
      popover: "oklch(0.17 0.015 275)",
      popoverForeground: "oklch(0.92 0.008 275)",
      primary: "oklch(0.65 0.08 280)",
      primaryForeground: "oklch(0.14 0.012 275)",
      secondary: "oklch(0.22 0.015 275)",
      secondaryForeground: "oklch(0.90 0.010 275)",
      muted: "oklch(0.22 0.015 275)",
      mutedForeground: "oklch(0.58 0.012 275)",
      accent: "oklch(0.20 0.025 278)",
      accentForeground: "oklch(0.90 0.010 275)",
      destructive: "oklch(0.60 0.16 22)",
      border: "oklch(1 0 0 / 8%)",
      input: "oklch(1 0 0 / 12%)",
      ring: "oklch(0.65 0.08 280)",
      sidebar: "oklch(0.16 0.015 275)",
      sidebarForeground: "oklch(0.82 0.008 275)",
      sidebarPrimary: "oklch(0.65 0.08 280)",
      sidebarPrimaryForeground: "oklch(0.14 0.012 275)",
      sidebarAccent: "oklch(0.20 0.025 278)",
      sidebarAccentForeground: "oklch(0.90 0.010 275)",
      sidebarBorder: "oklch(0.22 0.012 275)",
      sidebarRing: "oklch(0.65 0.08 280)",
      accentColor: "oklch(0.65 0.08 280)",
      selectionBg: "oklch(0.32 0.06 278)",
      selectionFg: "oklch(0.92 0.008 275)",
    },
  },
];

export const DEFAULT_THEME_ID = "paper";

function getThemeById(id: string): ThemeDefinition {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

// ─── Provider ──────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<string>(DEFAULT_THEME_ID);
  const [fontSize, setFontSizeState] = useState<FontSize>("md");
  const [fontId, setFontIdState] = useState<string>(DEFAULT_FONT_ID);
  const [customFonts, setCustomFontsState] = useState<FontDefinition[]>([]);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const savedThemeId = localStorage.getItem(STORAGE_KEYS.themeId);
      const savedFontSize = localStorage.getItem(STORAGE_KEYS.fontSize) as FontSize | null;
      const savedFontId = localStorage.getItem(STORAGE_KEYS.fontId);
      const savedCustomFonts = localStorage.getItem(STORAGE_KEYS.customFonts);

      if (savedThemeId && THEMES.some((t) => t.id === savedThemeId)) setThemeIdState(savedThemeId);
      if (savedFontSize) setFontSizeState(savedFontSize);

      let loadedCustom: FontDefinition[] = [];
      if (savedCustomFonts) {
        try {
          loadedCustom = JSON.parse(savedCustomFonts) as FontDefinition[];
          setCustomFontsState(loadedCustom);
        } catch {}
      }

      if (savedFontId) {
        const allFonts = [...FONTS, ...loadedCustom];
        if (allFonts.some((f) => f.id === savedFontId)) setFontIdState(savedFontId);
      }
    } catch (e) {
      console.warn("Failed to load theme preferences:", e);
    }
  }, []);

  // Inject <link> tags for custom Google Fonts
  useEffect(() => {
    // Clean up any previously injected font links
    document.querySelectorAll("link[data-study-doc-font]").forEach((el) => el.remove());

    for (const font of customFonts) {
      if (font.type === "custom" && font.stack.startsWith("__url:")) {
        const url = font.stack.split("__url:")[1].split("__family:")[0];
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = url;
        link.setAttribute("data-study-doc-font", font.id);
        document.head.appendChild(link);
      }
    }
  }, [customFonts]);

  // Apply theme tokens + font to :root
  useEffect(() => {
    const root = document.documentElement;
    const theme = getThemeById(themeId);
    const t = theme.tokens;

    // Apply dark class for Tailwind dark: variants
    root.classList.remove("light", "dark");
    root.classList.add(theme.mode);

    // Surfaces
    root.style.setProperty("--background", t.background);
    root.style.setProperty("--foreground", t.foreground);
    root.style.setProperty("--card", t.card);
    root.style.setProperty("--card-foreground", t.cardForeground);
    root.style.setProperty("--popover", t.popover);
    root.style.setProperty("--popover-foreground", t.popoverForeground);

    // Primary
    root.style.setProperty("--primary", t.primary);
    root.style.setProperty("--primary-foreground", t.primaryForeground);

    // Secondary
    root.style.setProperty("--secondary", t.secondary);
    root.style.setProperty("--secondary-foreground", t.secondaryForeground);

    // Muted
    root.style.setProperty("--muted", t.muted);
    root.style.setProperty("--muted-foreground", t.mutedForeground);

    // Accent
    root.style.setProperty("--accent", t.accent);
    root.style.setProperty("--accent-foreground", t.accentForeground);

    // Destructive
    root.style.setProperty("--destructive", t.destructive);

    // Borders & input
    root.style.setProperty("--border", t.border);
    root.style.setProperty("--input", t.input);
    root.style.setProperty("--ring", t.ring);

    // Sidebar
    root.style.setProperty("--sidebar", t.sidebar);
    root.style.setProperty("--sidebar-foreground", t.sidebarForeground);
    root.style.setProperty("--sidebar-primary", t.sidebarPrimary);
    root.style.setProperty("--sidebar-primary-foreground", t.sidebarPrimaryForeground);
    root.style.setProperty("--sidebar-accent", t.sidebarAccent);
    root.style.setProperty("--sidebar-accent-foreground", t.sidebarAccentForeground);
    root.style.setProperty("--sidebar-border", t.sidebarBorder);
    root.style.setProperty("--sidebar-ring", t.sidebarRing);

    // Legacy accent-color (sidebar.css active indicators)
    root.style.setProperty("--accent-color", t.accentColor);

    // Selection colors
    root.style.setProperty("--selection-bg", t.selectionBg);
    root.style.setProperty("--selection-fg", t.selectionFg);

    // Font size
    const fontSizeMap: Record<FontSize, string> = { sm: "14px", md: "16px", lg: "18px" };
    root.style.setProperty("--base-font-size", fontSizeMap[fontSize]);

    // Font family — resolve custom fonts that encode url+family
    const font = getFontById(fontId, customFonts);
    let resolvedStack = font.stack;
    if (font.type === "custom" && font.stack.startsWith("__url:")) {
      const family = font.stack.split("__family:")[1];
      resolvedStack = `"${family}", sans-serif`;
    }
    root.style.setProperty("--font-body", resolvedStack);
  }, [themeId, fontSize, fontId, customFonts]);

  // Setters with persistence
  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
    try { localStorage.setItem(STORAGE_KEYS.themeId, id); } catch {}
  }, []);

  const setFontSize = useCallback((size: FontSize) => {
    setFontSizeState(size);
    try { localStorage.setItem(STORAGE_KEYS.fontSize, size); } catch {}
  }, []);

  const setFontId = useCallback((id: string) => {
    setFontIdState(id);
    try { localStorage.setItem(STORAGE_KEYS.fontId, id); } catch {}
  }, []);

  const addCustomFont = useCallback((input: string): FontDefinition | null => {
    const parsed = parseGoogleFontUrl(input);
    if (!parsed) return null;

    const id = `custom-${parsed.family.toLowerCase().replace(/\s+/g, "-")}`;
    // Don't add duplicates
    if (customFonts.some((f) => f.id === id)) return customFonts.find((f) => f.id === id)!;

    const font: FontDefinition = {
      id,
      name: parsed.family,
      // Encode URL + family so we can inject <link> and resolve the stack separately
      stack: `__url:${parsed.url}__family:${parsed.family}`,
      description: "Google Fonts import",
      type: "custom",
    };
    const updated = [...customFonts, font];
    setCustomFontsState(updated);
    try { localStorage.setItem(STORAGE_KEYS.customFonts, JSON.stringify(updated)); } catch {}
    return font;
  }, [customFonts]);

  const removeCustomFont = useCallback((id: string) => {
    const updated = customFonts.filter((f) => f.id !== id);
    setCustomFontsState(updated);
    try { localStorage.setItem(STORAGE_KEYS.customFonts, JSON.stringify(updated)); } catch {}
    // If active font was removed, reset to default
    if (fontId === id) {
      setFontIdState(DEFAULT_FONT_ID);
      try { localStorage.setItem(STORAGE_KEYS.fontId, DEFAULT_FONT_ID); } catch {}
    }
  }, [customFonts, fontId]);

  const currentTheme = getThemeById(themeId);
  const currentFont = getFontById(fontId, customFonts);
  const allFonts = [...FONTS, ...customFonts];

  const value: ThemeContextType = {
    themeId, setThemeId,
    fontSize, setFontSize,
    fontId, setFontId,
    customFonts, addCustomFont, removeCustomFont,
    currentTheme,
    currentFont,
    themes: THEMES,
    fonts: allFonts,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
