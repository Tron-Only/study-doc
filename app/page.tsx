"use client";

import { useEffect, useState } from "react";
import { useTheme, ThemeSelector } from "@/components/theme";
import { useRepos } from "@/components/repo";
import { Button } from "@/components/ui/button";
import { FileText, Clock, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface RecentNote {
  path: string;
  title: string;
  timestamp: number;
  preview?: string;
}

export default function DashboardPage() {
  const { currentTheme } = useTheme();
  const { activeRepo } = useRepos();
  const router = useRouter();
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const loadRecentNotes = () => {
      try {
        const savedNotes = localStorage.getItem("study-doc:recent_notes");
        if (savedNotes) {
          setRecentNotes(JSON.parse(savedNotes));
        }
      } catch (e) {
        console.warn("Failed to load recent notes:", e);
      }
    };
    
    loadRecentNotes();

    const handleNotesUpdated = () => loadRecentNotes();
    window.addEventListener("study-doc:recent-notes-updated", handleNotesUpdated);
    return () => window.removeEventListener("study-doc:recent-notes-updated", handleNotesUpdated);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10">
      <div className="max-w-4xl mx-auto">

        {/* ── Header ────────────────────────────────────────── */}
        <header className="flex items-start justify-between gap-6 mb-10 pt-2">
          {/* Left — branding, stacked */}
          <div>
            <h1
              className="text-2xl font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-ibm-plex-sans), var(--font-geist-sans), system-ui" }}
            >
              Study Doc
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeRepo ? (
                <>{activeRepo.owner}<span className="mx-1 opacity-40">/</span>{activeRepo.name}</>
              ) : (
                "No repository configured"
              )}
            </p>
          </div>

          {/* Right — buttons on top, shortcuts below */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => window.dispatchEvent(new CustomEvent("study-doc:open-search"))}
              >
                <Search className="w-3.5 h-3.5 mr-1.5" />
                Search
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  const lastNote = recentNotes[0];
                  if (lastNote) router.push(`/notes/${lastNote.path}`);
                }}
                disabled={recentNotes.length === 0}
              >
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                Continue Reading
              </Button>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground/40">
              <span className="flex items-center gap-1">
                <kbd className="inline-flex items-center justify-center w-[18px] h-[18px] rounded border border-border/50 text-[9px] font-mono leading-none">?</kbd>
                Shortcuts
              </span>
              <span className="flex items-center gap-1">
                <kbd className="inline-flex items-center justify-center w-[18px] h-[18px] rounded border border-border/50 text-[9px] font-mono leading-none">/</kbd>
                Palette
              </span>
              <span className="flex items-center gap-1">
                <kbd className="inline-flex items-center justify-center w-[18px] h-[18px] rounded border border-border/50 text-[9px] font-mono leading-none">R</kbd>
                Random
              </span>
            </div>
          </div>
        </header>

        {/* ── Appearance ────────────────────────────────────── */}
        <section className="mb-10">
          <ThemeSelector />
        </section>

        <div className="h-px bg-border/50 mb-10" />

        {/* ── Recent Notes + Overview ───────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <section className="lg:col-span-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Recent Notes
            </h2>
            {recentNotes.length > 0 ? (
              <div className="space-y-0.5">
                {recentNotes.slice(0, 7).map((note, index) => {
                  const displayTitle = decodeURIComponent(note.title).replace(/%20/g, ' ');
                  return (
                    <Link
                      key={index}
                      href={`/notes/${note.path}`}
                      className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-md hover:bg-accent/60 transition-colors group"
                    >
                      <FileText className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground/70 flex-shrink-0" />
                      <span className="text-sm truncate flex-1">{displayTitle}</span>
                      <span className="text-[11px] text-muted-foreground/60 tabular-nums flex-shrink-0">
                        {new Date(note.timestamp).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No recent notes</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Start reading to see them here</p>
              </div>
            )}
          </section>

          {activeRepo && (
            <aside className="lg:col-span-2">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                Overview
              </h2>
              <div className="flex gap-8">
                <div>
                  <div className="text-2xl font-semibold tabular-nums">
                    {activeRepo.stats?.fileCount ?? "\u2014"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Notes</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold tabular-nums">
                    {activeRepo.stats?.folderCount ?? "\u2014"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Folders</div>
                </div>
              </div>
            </aside>
          )}
        </div>

      </div>
    </div>
  );
}
