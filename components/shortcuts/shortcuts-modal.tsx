"use client";

import React, { useEffect, useState } from "react";
import { X, Command, Search, Shuffle, ArrowRight, Keyboard } from "lucide-react";

interface Shortcut {
  key: string;
  description: string;
  icon?: React.ReactNode;
}

const SHORTCUTS: Shortcut[] = [
  { key: "/", description: "Open command palette", icon: <Command className="w-4 h-4" /> },
  { key: "?", description: "Show keyboard shortcuts", icon: <Keyboard className="w-4 h-4" /> },
  { key: "R", description: "Open random note", icon: <Shuffle className="w-4 h-4" /> },
  { key: "C", description: "Continue reading", icon: <ArrowRight className="w-4 h-4" /> },
  { key: "↑ / ↓", description: "Navigate items" },
  { key: "Enter", description: "Select item" },
  { key: "ESC", description: "Close modal" },
];

export function ShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleShow = () => setIsOpen(true);
    window.addEventListener("study-doc:show-shortcuts", handleShow);
    return () => window.removeEventListener("study-doc:show-shortcuts", handleShow);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div className="w-full max-w-md bg-popover border rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-muted rounded"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-4">
          <div className="space-y-2">
            {SHORTCUTS.map((shortcut) => (
              <div
                key={shortcut.key}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  {shortcut.icon && (
                    <span className="text-muted-foreground">{shortcut.icon}</span>
                  )}
                  <span className="text-sm">{shortcut.description}</span>
                </div>
                <kbd className="px-2 py-1 text-xs bg-muted rounded font-mono">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-muted/30 text-xs text-muted-foreground text-center">
          Press any key to start using shortcuts
        </div>
      </div>
    </div>
  );
}
