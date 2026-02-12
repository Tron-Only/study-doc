"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useRepos } from "@/components/repo";
import { Command, Search, GitBranch, FileText, Shuffle, ArrowRight } from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  query: string;
  setQuery: (query: string) => void;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  filteredCommands: CommandItem[];
}

const CommandPaletteContext = createContext<CommandPaletteContextType | undefined>(undefined);

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { repos, activeRepo, setActiveRepo } = useRepos();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery("");
    setSelectedIndex(0);
    // Focus input after a short delay to ensure it's rendered
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  // Get all markdown files from sidebar for random selection
  const getAllNotes = useCallback(() => {
    const notes: { path: string; title: string }[] = [];
    
    const traverse = (items: any[]) => {
      items?.forEach((item) => {
        if (item.items && item.items.length > 0) {
          traverse(item.items);
        } else if (item.url?.endsWith(".md")) {
          notes.push({ path: item.url, title: item.title });
        }
      });
    };
    
    if (activeRepo?.sidebar) {
      traverse(activeRepo.sidebar);
    }
    
    return notes;
  }, [activeRepo]);

  // Build commands dynamically based on repos
  const commands: CommandItem[] = [
    // Navigation commands
    {
      id: "search",
      label: "Search notes...",
      shortcut: "/search",
      icon: <Search className="w-4 h-4" />,
      action: () => {
        // Will be handled by search modal
        window.dispatchEvent(new CustomEvent("study-doc:open-search"));
        close();
      },
      keywords: ["search", "find", "query"],
    },
    {
      id: "random",
      label: "Open random note",
      shortcut: "R",
      icon: <Shuffle className="w-4 h-4" />,
      action: () => {
        const notes = getAllNotes();
        if (notes.length > 0) {
          const randomNote = notes[Math.floor(Math.random() * notes.length)];
          router.push(`/notes/${randomNote.path}`);
        }
        close();
      },
      keywords: ["random", "shuffle", "lucky"],
    },
    {
      id: "continue",
      label: "Continue reading",
      shortcut: "C",
      icon: <ArrowRight className="w-4 h-4" />,
      action: () => {
        const lastNote = localStorage.getItem("study-doc:last_note");
        if (lastNote) {
          router.push(`/notes/${lastNote}`);
        }
        close();
      },
      keywords: ["continue", "resume", "last"],
    },
    {
      id: "shortcuts",
      label: "Show keyboard shortcuts",
      shortcut: "?",
      icon: <Command className="w-4 h-4" />,
      action: () => {
        window.dispatchEvent(new CustomEvent("study-doc:show-shortcuts"));
        close();
      },
      keywords: ["shortcuts", "keyboard", "help", "commands"],
    },
    // Repo commands
    ...repos.map((repo, index) => ({
      id: `repo-${repo.id}`,
      label: `Switch to ${repo.name}`,
      shortcut: index < 3 ? `⌘${index + 1}` : undefined,
      icon: <GitBranch className="w-4 h-4" />,
      action: () => {
        setActiveRepo(repo.id);
        close();
      },
      keywords: ["repo", "repository", "switch", repo.name, repo.owner],
    })),
  ];

  // Filter commands based on query
  const filteredCommands = query
    ? commands.filter((cmd) => {
        const queryLower = query.toLowerCase();
        // If query starts with "/", match against shortcuts
        if (queryLower.startsWith("/")) {
          return cmd.shortcut?.toLowerCase().startsWith(queryLower);
        }
        // Otherwise match against label and keywords
        const searchText = `${cmd.label} ${cmd.keywords?.join(" ") || ""}`.toLowerCase();
        return searchText.includes(queryLower);
      })
    : commands;

  // Find exact shortcut match for direct execution
  const findExactShortcutMatch = (input: string): CommandItem | undefined => {
    const inputLower = input.toLowerCase().trim();
    return commands.find((cmd) => cmd.shortcut?.toLowerCase() === inputLower);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show shortcuts with ? key (but not in input fields)
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.contentEditable === "true"
        ) {
          return;
        }
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("study-doc:show-shortcuts"));
        return;
      }

      // Open with / key (but not in input fields)
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.contentEditable === "true"
        ) {
          return;
        }
        e.preventDefault();
        open();
      }

      // Close with Escape
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        close();
      }

      // Global shortcuts when palette is closed
      if (!isOpen) {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.contentEditable === "true"
        ) {
          return;
        }

        // Random note - R
        if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          const notes = getAllNotes();
          if (notes.length > 0) {
            const randomNote = notes[Math.floor(Math.random() * notes.length)];
            router.push(`/notes/${randomNote.path}`);
          }
          return;
        }

        // Continue reading - C
        if (e.key === "c" || e.key === "C") {
          e.preventDefault();
          const lastNote = localStorage.getItem("study-doc:last_note");
          if (lastNote) {
            router.push(`/notes/${lastNote}`);
          }
          return;
        }

        // Repo switching - Cmd/Ctrl + 1, 2, 3
        if ((e.metaKey || e.ctrlKey) && e.key >= "1" && e.key <= "3") {
          e.preventDefault();
          const index = parseInt(e.key) - 1;
          if (repos[index]) {
            setActiveRepo(repos[index].id);
          }
          return;
        }
      }

      // Navigate with arrow keys
      if (isOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === "Enter") {
          e.preventDefault();
          // First check for exact shortcut match
          const exactMatch = findExactShortcutMatch(query);
          if (exactMatch) {
            exactMatch.action();
          } else if (filteredCommands[selectedIndex]) {
            // Fall back to selected item
            filteredCommands[selectedIndex].action();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, open, close, filteredCommands, selectedIndex]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const value: CommandPaletteContextType = {
    isOpen,
    open,
    close,
    toggle,
    query,
    setQuery,
    selectedIndex,
    setSelectedIndex,
    filteredCommands,
  };

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPaletteOverlay inputRef={inputRef} />
    </CommandPaletteContext.Provider>
  );
}

function CommandPaletteOverlay({ inputRef }: { inputRef: React.RefObject<HTMLInputElement | null> }) {
  const { isOpen, close, query, setQuery, filteredCommands, selectedIndex } = useCommandPalette();
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, inputRef]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div 
        ref={containerRef}
        className="w-full max-w-lg bg-popover border rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Command className="w-5 h-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
            autoFocus
          />
          <kbd className="px-2 py-1 text-xs bg-muted rounded">ESC</kbd>
        </div>

        {/* Commands List */}
        <div className="max-h-[400px] overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              No commands found
            </div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                onClick={cmd.action}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  index === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <span className="text-muted-foreground">{cmd.icon}</span>
                <span className="flex-1 text-sm">{cmd.label}</span>
                {cmd.shortcut && (
                  <kbd className="px-2 py-0.5 text-xs bg-muted rounded text-muted-foreground">
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground">
          <span>↑↓ to navigate</span>
          <span>↵ to select</span>
        </div>
      </div>
    </div>
  );
}

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (context === undefined) {
    throw new Error("useCommandPalette must be used within a CommandPaletteProvider");
  }
  return context;
}
