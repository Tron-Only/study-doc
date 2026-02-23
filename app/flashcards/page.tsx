"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Play, Shuffle, BookOpen, Zap, TrendingUp, RotateCcw } from "lucide-react";
import { useRepos } from "@/components/repo";
import { fetchAllFlashcardDecks, extractFlashcardPaths } from "@/lib/flashcard-parser";
import { loadAllStats } from "@/lib/spaced-repetition";
import type { FlashcardDeck } from "@/lib/flashcard-types";
import { BLINDS } from "@/lib/flashcard-types";
import "@/components/flashcards/flashcard-styles.css";

// ─── Deck stats helpers ────────────────────────────────────────

function getDeckStats(deck: FlashcardDeck) {
  const allStats = loadAllStats();
  const now = Date.now();
  let due = 0;
  let learned = 0;

  for (const card of deck.cards) {
    const stats = allStats[card.id];
    if (!stats) continue;
    if (stats.reviews > 0) learned++;
    if (stats.due <= now) due++;
  }

  return { due, learned, total: deck.cards.length };
}

// ─── Inner component (needs useSearchParams) ──────────────────

function FlashcardsHubInner() {
  const { activeRepo } = useRepos();
  const router = useRouter();
  const searchParams = useSearchParams();

  // The repo-relative path of the Flashcards folder, e.g. "STU 1201/Flashcards"
  const folderPath = searchParams?.get("path") ?? "";

  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<{ paths: string[]; treeSize: number; folderPath: string } | null>(null);

  const loadDecks = useCallback(async () => {
    if (!activeRepo) {
      setLoading(false);
      return;
    }
    if (!folderPath) {
      setError("No flashcard folder specified. Click a Flashcards folder in the sidebar.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { fetchRepoTree } = await import("@/lib/utils");
      const token = localStorage.getItem("docurepo:token") ?? undefined;
      const tree = await fetchRepoTree(activeRepo.owner, activeRepo.name, { token });

      const paths = extractFlashcardPaths(tree, folderPath);
      console.log("[Flashcards] folderPath:", JSON.stringify(folderPath));
      console.log("[Flashcards] tree entry count:", tree.length);
      console.log("[Flashcards] matching paths:", paths);
      const flashcardsEntries = tree.filter(e => e.path.toLowerCase().includes("flashcard"));
      console.log("[Flashcards] entries containing 'flashcard':", flashcardsEntries.map(e => `${e.type}:${e.path}`));
      setDebugInfo({ paths, treeSize: tree.length, folderPath });

      if (paths.length === 0) {
        setDecks([]);
        setLoading(false);
        return;
      }

      const fetched = await fetchAllFlashcardDecks(
        activeRepo.owner,
        activeRepo.name,
        paths,
        { token },
      );
      console.log("[Flashcards] fetched decks:", fetched.length);
      setDecks(fetched);
      if (fetched.length === 0 && paths.length > 0) {
        setError(`Found ${paths.length} path(s) but all failed to load. Check console for details.`);
      }
    } catch (e) {
      console.error("[Flashcards] error:", e);
      setError(e instanceof Error ? e.message : "Failed to load flashcard decks");
    } finally {
      setLoading(false);
    }
  }, [activeRepo, folderPath]);

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  const totalCards = decks.reduce((sum, d) => sum + d.cards.length, 0);

  const handlePlayUnit = (deckId: string) => {
    router.push(
      `/flashcards/play?mode=unit&deck=${encodeURIComponent(deckId)}&path=${encodeURIComponent(folderPath)}`,
    );
  };

  const handlePlayRandom = () => {
    router.push(`/flashcards/play?mode=random&path=${encodeURIComponent(folderPath)}`);
  };

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flashcard-page">
        <div className="fc-loading">
          <div className="fc-spinner" />
          <span>Loading decks…</span>
        </div>
      </div>
    );
  }

  // ── No repo ──────────────────────────────────────────────────
  if (!activeRepo) {
    return (
      <div className="flashcard-page">
        <div className="fc-empty">
          <div className="fc-empty-icon">📚</div>
          <p className="font-semibold mb-1">No repository configured</p>
          <p className="text-sm">Set up a GitHub repository to get started.</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flashcard-page">
        <div className="fc-empty">
          <div className="fc-empty-icon">⚠️</div>
          <p className="font-semibold mb-2">Failed to load decks</p>
          <p className="text-sm mb-4">{error}</p>
          <button className="flashcard-deck-card-play" onClick={loadDecks}>
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────────
  if (decks.length === 0) {
    return (
      <div className="flashcard-page">
        <div className="fc-empty">
          <div className="fc-empty-icon">🃏</div>
          <p className="font-semibold mb-1">No flashcard decks found</p>
          <p className="text-sm">
            Add <code>.yml</code> files directly inside{" "}
            <code>{folderPath || "your Flashcards folder"}</code>.
          </p>
          {debugInfo && (
            <details className="text-xs mt-3 text-left" open>
              <summary className="cursor-pointer opacity-60 mb-1">Debug info</summary>
              <pre className="opacity-70 whitespace-pre-wrap break-all">
                {`folderPath: ${JSON.stringify(debugInfo.folderPath)}\ntree entries: ${debugInfo.treeSize}\nmatching paths: ${JSON.stringify(debugInfo.paths, null, 2)}`}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  // ── Hub ──────────────────────────────────────────────────────
  return (
    <div className="flashcard-page">
      <div className="flashcard-hub">
        {/* Header */}
        <div className="flashcard-hub-header">
          <h1 className="flashcard-hub-title">Flashcards</h1>
          <p className="flashcard-hub-subtitle">
            {decks.length} deck{decks.length !== 1 ? "s" : ""} · {totalCards} cards total
            {folderPath && (
              <span className="fc-hub-path"> · {folderPath}</span>
            )}
          </p>
        </div>

        {/* Blind overview strip */}
        <div className="fc-blinds-strip">
          {BLINDS.map((blind) => (
            <div key={blind.name} className={`fc-blind-chip fc-blind-chip--${blind.name}`}>
              <span className="fc-blind-chip-label">{blind.label}</span>
              <span className="fc-blind-chip-detail">
                {blind.cardCount} cards · {Math.round(blind.threshold * 100)}%
              </span>
            </div>
          ))}
        </div>

        {/* Deck grid */}
        <div className="flashcard-deck-grid">
          {decks.map((deck) => {
            const stats = getDeckStats(deck);

            return (
              <div key={deck.id} className="flashcard-deck-card">
                <div className="flashcard-deck-stats">
                  {stats.due > 0 && (
                    <span className="flashcard-stat-badge due">{stats.due} due</span>
                  )}
                  {stats.learned > 0 && (
                    <span className="flashcard-stat-badge learned">{stats.learned} learned</span>
                  )}
                </div>

                <div className="flashcard-deck-card-icon">
                  <BookOpen size={18} />
                </div>

                <div className="flashcard-deck-card-title">{deck.title}</div>

                <div className="flashcard-deck-card-meta">
                  <span className="flashcard-deck-card-count">
                    {deck.cards.length} card{deck.cards.length !== 1 ? "s" : ""}
                  </span>
                  {stats.learned > 0 && (
                    <div className="flashcard-deck-progress">
                      <div
                        className="flashcard-deck-progress-fill"
                        style={{ width: `${Math.round((stats.learned / stats.total) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                <button
                  className="flashcard-deck-card-play"
                  onClick={() => handlePlayUnit(deck.id)}
                >
                  <Play size={12} />
                  Study
                </button>
              </div>
            );
          })}
        </div>

        {/* Overall stats row */}
        <div className="fc-hub-stats-row">
          <div className="fc-hub-stat">
            <Zap size={16} />
            <span>{decks.reduce((s, d) => s + getDeckStats(d).due, 0)} cards due</span>
          </div>
          <div className="fc-hub-stat">
            <TrendingUp size={16} />
            <span>{decks.reduce((s, d) => s + getDeckStats(d).learned, 0)} learned</span>
          </div>
        </div>
      </div>

      {/* Floating Random Round button */}
      <button className="flashcard-random-btn" onClick={handlePlayRandom}>
        <Shuffle size={18} />
        Random Round
      </button>
    </div>
  );
}

// ─── Page with Suspense boundary ──────────────────────────────

export default function FlashcardsHubPage() {
  return (
    <Suspense
      fallback={
        <div className="flashcard-page">
          <div className="fc-loading">
            <div className="fc-spinner" />
            <span>Loading…</span>
          </div>
        </div>
      }
    >
      <FlashcardsHubInner />
    </Suspense>
  );
}

