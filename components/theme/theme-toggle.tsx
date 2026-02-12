"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "./theme-provider";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { themeMode, setThemeMode } = useTheme();

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      <Button
        variant={themeMode === "light" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setThemeMode("light")}
        className="gap-2"
      >
        <Sun className="w-4 h-4" />
        <span className="hidden sm:inline">Light</span>
      </Button>
      <Button
        variant={themeMode === "dark" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setThemeMode("dark")}
        className="gap-2"
      >
        <Moon className="w-4 h-4" />
        <span className="hidden sm:inline">Dark</span>
      </Button>
      <Button
        variant={themeMode === "system" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setThemeMode("system")}
        className="gap-2"
      >
        <Monitor className="w-4 h-4" />
        <span className="hidden sm:inline">System</span>
      </Button>
    </div>
  );
}
