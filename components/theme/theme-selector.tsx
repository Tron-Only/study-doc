"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useTheme } from "./theme-provider";
import type { ThemeDefinition, FontDefinition } from "./theme-provider";
import { cn } from "@/lib/utils";
import { Check, Plus, X, Link2 } from "lucide-react";

// ─── Scrollable List with Fade ─────────────────────────────────
// Wraps children in a max-height container with a bottom fade
// that appears only when there's more content to scroll.

function ScrollableList({
  children,
  className,
  maxHeight = 280,
}: {
  children: React.ReactNode;
  className?: string;
  maxHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [atBottom, setAtBottom] = useState(false);

  const checkScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const hasOverflow = el.scrollHeight > el.clientHeight + 2;
    setCanScroll(hasOverflow);
    setAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => ro.disconnect();
  }, [checkScroll]);

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={checkScroll}
        className={cn("overflow-y-auto overscroll-contain pr-1 -mr-1", className)}
        style={{ maxHeight }}
      >
        {children}
      </div>
      {/* Bottom fade — visible when scrollable and not at bottom */}
      <div
        className={cn(
          "pointer-events-none absolute bottom-0 left-0 right-1 h-10 transition-opacity duration-200",
          canScroll && !atBottom ? "opacity-100" : "opacity-0",
        )}
        style={{
          background: "linear-gradient(to bottom, transparent, var(--background))",
        }}
      />
    </div>
  );
}

// ─── Theme Swatch ──────────────────────────────────────────────

function ThemeSwatches({ swatches }: { swatches: ThemeDefinition["swatches"] }) {
  return (
    <div className="flex items-center gap-1">
      {swatches.map((color, i) => (
        <span
          key={i}
          className="rounded-full border border-border/40"
          style={{ backgroundColor: color, width: 12, height: 12 }}
        />
      ))}
    </div>
  );
}

// ─── Theme Card ────────────────────────────────────────────────

function ThemeCard({
  theme,
  isActive,
  onSelect,
}: {
  theme: ThemeDefinition;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative w-full text-left rounded-lg p-2.5 transition-all duration-150",
        "border hover:border-primary/30",
        isActive
          ? "border-primary/50 bg-accent/60"
          : "border-border/40 bg-transparent hover:bg-accent/30",
      )}
    >
      {isActive && (
        <span className="absolute top-2 right-2 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-primary">
          <Check className="w-2 h-2 text-primary-foreground" strokeWidth={3} />
        </span>
      )}
      <div className="flex items-start gap-2.5">
        <div className="pt-0.5">
          <ThemeSwatches swatches={theme.swatches} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium leading-tight">{theme.name}</span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground/50">
              {theme.mode}
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
            {theme.description}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Font Row ──────────────────────────────────────────────────

function FontRow({
  font,
  isActive,
  onSelect,
  onRemove,
}: {
  font: FontDefinition;
  isActive: boolean;
  onSelect: () => void;
  onRemove?: () => void;
}) {
  let previewStyle: React.CSSProperties = {};
  if (font.type === "custom" && font.stack.startsWith("__url:")) {
    const family = font.stack.split("__family:")[1];
    previewStyle = { fontFamily: `"${family}", sans-serif` };
  } else {
    previewStyle = { fontFamily: font.stack };
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative w-full text-left rounded-md px-2.5 py-2 transition-all duration-150",
        "border",
        isActive
          ? "border-primary/50 bg-accent/60"
          : "border-border/30 bg-transparent hover:bg-accent/30 hover:border-primary/20",
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={cn(
            "flex-shrink-0 w-3 h-3 rounded-full border flex items-center justify-center transition-colors",
            isActive ? "bg-primary border-primary" : "border-muted-foreground/30",
          )}
        >
          {isActive && <Check className="w-1.5 h-1.5 text-primary-foreground" strokeWidth={3} />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium leading-tight truncate" style={previewStyle}>
              {font.name}
            </span>
            {font.type === "custom" && (
              <span className="text-[8px] uppercase tracking-wider text-primary/60 bg-primary/10 px-1 py-0.5 rounded flex-shrink-0">
                imported
              </span>
            )}
          </div>
          <div
            className="text-[11px] text-muted-foreground mt-0.5 leading-snug truncate"
            style={previewStyle}
          >
            {font.description}
          </div>
        </div>
        {onRemove && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onRemove(); } }}
            className="flex-shrink-0 p-1 rounded hover:bg-destructive/15 text-muted-foreground/40 hover:text-destructive transition-colors"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Google Font Import ────────────────────────────────────────

function GoogleFontImport() {
  const { addCustomFont, setFontId } = useTheme();
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showInput, setShowInput] = useState(false);

  const handleImport = () => {
    if (!inputValue.trim()) return;
    setError(null);
    const font = addCustomFont(inputValue.trim());
    if (font) {
      setFontId(font.id);
      setInputValue("");
      setShowInput(false);
    } else {
      setError("Invalid Google Fonts URL");
    }
  };

  if (!showInput) {
    return (
      <button
        type="button"
        onClick={() => setShowInput(true)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-md border border-dashed border-border/50 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-accent/20 transition-colors"
      >
        <Plus className="w-3 h-3" />
        Import from Google Fonts
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setError(null); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleImport();
              if (e.key === "Escape") { setShowInput(false); setInputValue(""); setError(null); }
            }}
            placeholder="Paste Google Fonts link..."
            className={cn(
              "w-full pl-7 pr-2 py-1.5 text-xs rounded-md border bg-background",
              "placeholder:text-muted-foreground/40",
              "focus:outline-none focus:ring-1 focus:ring-ring",
              error ? "border-destructive/50" : "border-border/50",
            )}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        </div>
        <button
          type="button"
          onClick={handleImport}
          disabled={!inputValue.trim()}
          className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => { setShowInput(false); setInputValue(""); setError(null); }}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
        Go to{" "}
        <a href="https://fonts.google.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground/60">
          fonts.google.com
        </a>
        , pick a font, copy the {'"'}Get embed code{'"'} link tag.
      </p>
    </div>
  );
}

// ─── Font Size Control ─────────────────────────────────────────

function FontSizeControl() {
  const { fontSize, setFontSize } = useTheme();
  const sizes: Array<{ value: "sm" | "md" | "lg"; label: string }> = [
    { value: "sm", label: "Sm" },
    { value: "md", label: "Md" },
    { value: "lg", label: "Lg" },
  ];

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        Text Size
      </label>
      <div className="flex gap-1">
        {sizes.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFontSize(value)}
            className={cn(
              "flex-1 rounded-md py-1.5 text-xs font-medium transition-colors",
              fontSize === value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Theme Selector ────────────────────────────────────────────
// Layout: Theme (left) | Typeface (right) — always side by side.
// Text size centered below both columns.

export function ThemeSelector({ className }: { className?: string }) {
  const { themeId, setThemeId, themes, fontId, setFontId, fonts, customFonts, removeCustomFont } = useTheme();

  const builtInFonts = fonts.filter((f) => f.type !== "custom");
  const imported = customFonts;

  return (
    <div className={className}>
      {/* Two columns — forced with inline style so it always renders side-by-side */}
      <div
        className="gap-6"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}
      >
        {/* Left — Theme */}
        <div className="space-y-2 min-w-0">
          <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Theme
          </label>
          <ScrollableList maxHeight={260}>
            <div className="space-y-1.5">
              {themes.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  isActive={themeId === theme.id}
                  onSelect={() => setThemeId(theme.id)}
                />
              ))}
            </div>
          </ScrollableList>
        </div>

        {/* Right — Typeface */}
        <div className="space-y-2 min-w-0">
          <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Typeface
          </label>
          <ScrollableList maxHeight={210}>
            <div className="space-y-1.5">
              {builtInFonts.map((font) => (
                <FontRow
                  key={font.id}
                  font={font}
                  isActive={fontId === font.id}
                  onSelect={() => setFontId(font.id)}
                />
              ))}
              {imported.length > 0 && (
                <>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground/50 pt-2 pb-0.5">
                    Imported
                  </div>
                  {imported.map((font) => (
                    <FontRow
                      key={font.id}
                      font={font}
                      isActive={fontId === font.id}
                      onSelect={() => setFontId(font.id)}
                      onRemove={() => removeCustomFont(font.id)}
                    />
                  ))}
                </>
              )}
            </div>
          </ScrollableList>
          <GoogleFontImport />
        </div>
      </div>

      {/* Text size — centered below both columns */}
      <div className="mt-5 max-w-xs mx-auto">
        <FontSizeControl />
      </div>
    </div>
  );
}
