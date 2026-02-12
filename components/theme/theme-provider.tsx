"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

type ThemeMode = "light" | "dark" | "system";
type AccentType = "preset" | "custom";

interface ThemeContextType {
  // Theme mode
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  
  // Accent color
  accentColor: string;
  accentColorRgba: string; // RGBA version with transparency
  setAccentColor: (color: string) => void;
  accentType: AccentType;
  setAccentType: (type: AccentType) => void;
  
  // Grain effect
  grainEnabled: boolean;
  setGrainEnabled: (enabled: boolean) => void;
  grainIntensity: number;
  setGrainIntensity: (intensity: number) => void;
  
  // Font size
  fontSize: "sm" | "md" | "lg";
  setFontSize: (size: "sm" | "md" | "lg") => void;
  
  // Transparency
  transparency: number;
  setTransparency: (transparency: number) => void;
  
  // Computed
  resolvedTheme: "light" | "dark";
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEYS = {
  themeMode: "study-doc:theme_mode",
  accentColor: "study-doc:accent_color",
  accentType: "study-doc:accent_type",
  grainEnabled: "study-doc:grain_enabled",
  grainIntensity: "study-doc:grain_intensity",
  fontSize: "study-doc:font_size",
  transparency: "study-doc:transparency",
};

const DEFAULT_PRESETS = [
  "#3b82f6", // Blue
  "#a855f7", // Purple
  "#10b981", // Green
  "#f97316", // Orange
  "#ec4899", // Pink
  "#06b6d4", // Cyan
];

const DEFAULT_ACCENT = DEFAULT_PRESETS[0];

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Theme mode
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");
  const [isDark, setIsDark] = useState(true);
  
  // Accent color
  const [accentColor, setAccentColorState] = useState<string>(DEFAULT_ACCENT);
  const [accentType, setAccentTypeState] = useState<AccentType>("preset");
  
  // Grain effect
  const [grainEnabled, setGrainEnabledState] = useState<boolean>(false);
  const [grainIntensity, setGrainIntensityState] = useState<number>(30);
  
  // Font size
  const [fontSize, setFontSizeState] = useState<"sm" | "md" | "lg">("md");
  
  // Transparency
  const [transparency, setTransparencyState] = useState<number>(100);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedThemeMode = localStorage.getItem(STORAGE_KEYS.themeMode) as ThemeMode | null;
      const savedAccentColor = localStorage.getItem(STORAGE_KEYS.accentColor);
      const savedAccentType = localStorage.getItem(STORAGE_KEYS.accentType) as AccentType | null;
      const savedGrainEnabled = localStorage.getItem(STORAGE_KEYS.grainEnabled);
      const savedGrainIntensity = localStorage.getItem(STORAGE_KEYS.grainIntensity);
      const savedFontSize = localStorage.getItem(STORAGE_KEYS.fontSize) as "sm" | "md" | "lg" | null;
      const savedTransparency = localStorage.getItem(STORAGE_KEYS.transparency);

      if (savedThemeMode) setThemeModeState(savedThemeMode);
      if (savedAccentColor) setAccentColorState(savedAccentColor);
      if (savedAccentType) setAccentTypeState(savedAccentType);
      if (savedGrainEnabled !== null) setGrainEnabledState(savedGrainEnabled === "true");
      if (savedGrainIntensity !== null) setGrainIntensityState(parseInt(savedGrainIntensity, 10));
      if (savedFontSize) setFontSizeState(savedFontSize);
      if (savedTransparency !== null) setTransparencyState(parseInt(savedTransparency, 10));
    } catch (e) {
      console.warn("Failed to load theme preferences:", e);
    }
  }, []);

  // Update resolved theme when mode changes
  useEffect(() => {
    const resolved = themeMode === "system" ? getSystemTheme() : themeMode;
    setResolvedTheme(resolved);
    setIsDark(resolved === "dark");
  }, [themeMode]);

  // Listen for system theme changes
  useEffect(() => {
    if (themeMode !== "system") return;
    
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? "dark" : "light");
      setIsDark(e.matches);
    };
    
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [themeMode]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply dark/light class
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
    
    // Apply accent color as CSS custom property (hex format for compatibility)
    root.style.setProperty("--accent-color", accentColor);
    
    // Apply accent color with transparency as RGBA
    const hex = accentColor.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const alpha = transparency / 100;
    root.style.setProperty("--accent-color-rgb", `${r}, ${g}, ${b}`);
    root.style.setProperty("--accent-color-rgba", `rgba(${r}, ${g}, ${b}, ${alpha})`);
    
    // Apply font size
    const fontSizeMap = { sm: "14px", md: "16px", lg: "18px" };
    root.style.setProperty("--base-font-size", fontSizeMap[fontSize]);
    
    // Apply grain effect
    root.style.setProperty("--grain-opacity", (grainIntensity / 100).toString());
    if (grainEnabled) {
      root.setAttribute("data-grain", "true");
    } else {
      root.removeAttribute("data-grain");
    }
  }, [resolvedTheme, accentColor, grainEnabled, grainIntensity, fontSize, transparency]);

  // Setter functions with localStorage persistence
  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEYS.themeMode, mode);
    } catch (e) {
      console.warn("Failed to save theme mode:", e);
    }
  }, []);

  const setAccentColor = useCallback((color: string) => {
    setAccentColorState(color);
    try {
      localStorage.setItem(STORAGE_KEYS.accentColor, color);
    } catch (e) {
      console.warn("Failed to save accent color:", e);
    }
  }, []);

  const setAccentType = useCallback((type: AccentType) => {
    setAccentTypeState(type);
    try {
      localStorage.setItem(STORAGE_KEYS.accentType, type);
    } catch (e) {
      console.warn("Failed to save accent type:", e);
    }
  }, []);

  const setGrainEnabled = useCallback((enabled: boolean) => {
    setGrainEnabledState(enabled);
    try {
      localStorage.setItem(STORAGE_KEYS.grainEnabled, enabled.toString());
    } catch (e) {
      console.warn("Failed to save grain setting:", e);
    }
  }, []);

  const setGrainIntensity = useCallback((intensity: number) => {
    setGrainIntensityState(intensity);
    try {
      localStorage.setItem(STORAGE_KEYS.grainIntensity, intensity.toString());
    } catch (e) {
      console.warn("Failed to save grain intensity:", e);
    }
  }, []);

  const setFontSize = useCallback((size: "sm" | "md" | "lg") => {
    setFontSizeState(size);
    try {
      localStorage.setItem(STORAGE_KEYS.fontSize, size);
    } catch (e) {
      console.warn("Failed to save font size:", e);
    }
  }, []);

  const setTransparency = useCallback((value: number) => {
    setTransparencyState(value);
    try {
      localStorage.setItem(STORAGE_KEYS.transparency, value.toString());
    } catch (e) {
      console.warn("Failed to save transparency:", e);
    }
  }, []);

  // Compute RGBA version of accent color with transparency
  const accentColorRgba = React.useMemo(() => {
    const hex = accentColor.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const alpha = transparency / 100;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }, [accentColor, transparency]);

  const value: ThemeContextType = {
    themeMode,
    setThemeMode,
    accentColor,
    accentColorRgba,
    setAccentColor,
    accentType,
    setAccentType,
    grainEnabled,
    setGrainEnabled,
    grainIntensity,
    setGrainIntensity,
    fontSize,
    setFontSize,
    transparency,
    setTransparency,
    resolvedTheme,
    isDark,
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

export { DEFAULT_PRESETS, DEFAULT_ACCENT };
