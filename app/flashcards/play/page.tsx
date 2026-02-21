"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Trophy, RotateCcw, Home, ChevronRight } from "lucide-react";
import { useRepos } from "@/components/repo";
import { FlashcardDeckPlayer, type DeckResult } from "@/components/flashcards/FlashcardDeck";
import { fetchAllFlashcardDecks, extractFlashcardPaths, fetchFlashcardDeck } from "@/lib/flashcard-parser";
import { weightedSelect, sortForUnitMode, sessionSummary } from "@/lib/spaced-repetition";
import { BLINDS, RATING_COLORS, RATING_LABELS, type CardRating, type Flashcard, type FlashcardDeck } from "@/lib/flashcard-types";
import "@/components/flashcards/flashcard-styles.css";

// ─── Inner page (uses useSearchParams) ───────────────────────

function PlayPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { activeRepo } = useRepos();

  const mode = ((searchParams?.get("mode")) ?? "unit") as "unit" | "random";
  const deckId = searchParams?.get("deck") ?? "";
  const folderPath = searchParams?.get("path") ?? "";

  // ── State ──────────────────────────────────────────────────
  type Phase = "loading" | "error" | "playing" | "blind-intro" | "results" | "round-over";

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);

  // Unit mode
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [unitCards, setUnitCards] = useState<Flashcard[]>([]);

  // Random mode
  const [blindIndex, setBlindIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [blindCards, setBlindCards] = useState<Flashcard[]>([]);
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [roundPassed, setRoundPassed] = useState(false);

  // Results
  const [sessionResults, setSessionResults] = useState<DeckResult[]>([]);

  // ── Load ────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!activeRepo) {
      setError("No repository configured.");
      setPhase("error");
      return;
    }

    try {
      const token = localStorage.getItem("study-doc:token") ?? undefined;

      if (mode === "unit") {
        // Find the deck path
        const { fetchRepoTree } = await import("@/lib/utils");
        const tree = await fetchRepoTree(activeRepo.owner, activeRepo.name, { token });
        const paths = extractFlashcardPaths(tree, folderPath);
        const path = paths.find((p) => p.includes(deckId) || p.replace(/\.[^/.]+$/, "").endsWith(deckId));

        if (!path) throw new Error(`Deck "${deckId}" not found in repository.`);

        const loadedDeck = await fetchFlashcardDeck(activeRepo.owner, activeRepo.name, path, { token });
        setDeck(loadedDeck);
        setUnitCards(sortForUnitMode(loadedDeck.cards));
        setPhase("playing");
      } else {
        // Random mode: load all decks
        const { fetchRepoTree } = await import("@/lib/utils");
        const tree = await fetchRepoTree(activeRepo.owner, activeRepo.name, { token });
        const paths = extractFlashcardPaths(tree, folderPath);
        if (paths.length === 0) throw new Error("No flashcard decks found.");

        const decks = await fetchAllFlashcardDecks(activeRepo.owner, activeRepo.name, paths, { token });
        const combined = decks.flatMap((d) => d.cards);
        setAllCards(combined);

        // Start with first blind
        const blind = BLINDS[0];
        setBlindCards(weightedSelect(combined, blind.cardCount));
        setBlindIndex(0);
        setPhase("blind-intro");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load flashcards");
      setPhase("error");
    }
  }, [activeRepo, mode, deckId, folderPath]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Unit mode completion ────────────────────────────────────
  const handleUnitComplete = useCallback((results: DeckResult[]) => {
    setSessionResults(results);
    setPhase("results");
  }, []);

  // ── Random mode: blind completed ───────────────────────────
  const handleBlindComplete = useCallback(
    (results: DeckResult[]) => {
      const blind = BLINDS[blindIndex];
      const summary = sessionSummary(results);
      const passed = summary.pct / 100 >= blind.threshold;
      const earned = Math.round(summary.correct * 100 * blind.pointMultiplier);

      setScore((s) => s + earned);
      setSessionResults((prev) => [...prev, ...results]);
      setRoundPassed(passed);

      if (!passed || blindIndex >= BLINDS.length - 1) {
        // Failed blind or completed all blinds → end of round
        setPhase("round-over");
      } else {
        // Advance to next blind
        const nextBlindIndex = blindIndex + 1;
        const nextBlind = BLINDS[nextBlindIndex];
        setBlindCards(weightedSelect(allCards, nextBlind.cardCount));
        setBlindIndex(nextBlindIndex);
        setPhase("blind-intro");
      }
    },
    [blindIndex, allCards],
  );

  // ── Replay ──────────────────────────────────────────────────
  const handleReplay = () => {
    if (mode === "unit" && deck) {
      setUnitCards(sortForUnitMode(deck.cards));
      setSessionResults([]);
      setPhase("playing");
    } else {
      // Restart random round
      setScore(0);
      setBlindIndex(0);
      setSessionResults([]);
      const blind = BLINDS[0];
      setBlindCards(weightedSelect(allCards, blind.cardCount));
      setPhase("blind-intro");
    }
  };

  // ─────────────────────────────────────────────────────────────
  // ── Render phases
  // ─────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="flashcard-page">
        <div className="fc-loading">
          <div className="fc-spinner" />
          <span>Preparing cards…</span>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flashcard-page">
        <div className="fc-empty">
          <div className="fc-empty-icon">⚠️</div>
          <p className="font-semibold mb-2">Error</p>
          <p className="text-sm mb-4">{error}</p>
          <button className="flashcard-deck-card-play" onClick={() => router.push(`/flashcards?path=${encodeURIComponent(folderPath)}`)}>
            <ArrowLeft size={14} /> Back to Flashcards
          </button>
        </div>
      </div>
    );
  }

  // ── Blind intro splash ─────────────────────────────────────
  if (phase === "blind-intro") {
    const blind = BLINDS[blindIndex];
    return (
      <div className="flashcard-page">
        <div className="fc-blind-intro">
          <div className={`fc-blind-badge fc-blind-badge--${blind.name}`}>
            {blind.label}
          </div>
          <h2 className="fc-blind-intro-title">{blind.label}</h2>
          <div className="fc-blind-intro-details">
            <div className="fc-blind-detail">
              <span className="fc-blind-detail-value">{blind.cardCount}</span>
              <span className="fc-blind-detail-label">Cards</span>
            </div>
            <div className="fc-blind-detail">
              <span className="fc-blind-detail-value">{Math.round(blind.threshold * 100)}%</span>
              <span className="fc-blind-detail-label">Pass Threshold</span>
            </div>
            <div className="fc-blind-detail">
              <span className="fc-blind-detail-value">×{blind.pointMultiplier}</span>
              <span className="fc-blind-detail-label">Points</span>
            </div>
          </div>
          {score > 0 && (
            <div className="fc-blind-current-score">
              Current score: <strong>{score.toLocaleString()}</strong>
            </div>
          )}
          <button
            className="fc-blind-start-btn"
            onClick={() => setPhase("playing")}
            autoFocus
          >
            Start <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ── Playing ───────────────────────────────────────────────
  if (phase === "playing") {
    const blind = mode === "random" ? BLINDS[blindIndex] : undefined;
    const cards = mode === "unit" ? unitCards : blindCards;

    return (
      <div className="flashcard-page">
        {/* Back button */}
        <button
          className="fc-back-btn"
          onClick={() => router.push(`/flashcards?path=${encodeURIComponent(folderPath)}`)}
          aria-label="Back to flashcards"
        >
          <ArrowLeft size={16} />
        </button>

        <FlashcardDeckPlayer
          cards={cards}
          onComplete={mode === "unit" ? handleUnitComplete : handleBlindComplete}
          blindLabel={blind?.label}
          blindThreshold={blind?.threshold}
          score={score}
          pointMultiplier={blind?.pointMultiplier ?? 1}
        />
      </div>
    );
  }

  // ── Unit results ──────────────────────────────────────────
  if (phase === "results") {
    const summary = sessionSummary(sessionResults);

    return (
      <div className="flashcard-page">
        <div className="fc-results">
          <div className="fc-results-score">{summary.pct}%</div>
          <div className="fc-results-label">
            {summary.correct} / {summary.total} correct · {deck?.title}
          </div>

          <div className="fc-results-breakdown">
            {([1, 2, 3, 4] as CardRating[]).map((r) => {
              const count = sessionResults.filter((res) => res.rating === r).length;
              return (
                <div
                  key={r}
                  className="fc-result-chip"
                  style={{
                    borderColor: RATING_COLORS[r],
                    color: RATING_COLORS[r],
                    background: `${RATING_COLORS[r]}14`,
                  }}
                >
                  <div className="fc-result-chip-count">{count}</div>
                  <div className="fc-result-chip-label">{RATING_LABELS[r]}</div>
                </div>
              );
            })}
          </div>

          <ResultMessage pct={summary.pct} />

          <div className="fc-results-actions">
            <button className="fc-results-btn fc-results-btn--primary" onClick={handleReplay}>
              <RotateCcw size={16} /> Study Again
            </button>
            <button className="fc-results-btn" onClick={() => router.push(`/flashcards?path=${encodeURIComponent(folderPath)}`)}>
              <Home size={16} /> All Decks
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Random round over ─────────────────────────────────────
  if (phase === "round-over") {
    const summary = sessionSummary(sessionResults);
    const blind = BLINDS[blindIndex];
    const reachedBlind = blindIndex + 1;

    return (
      <div className="flashcard-page">
        <div className="fc-results">
          {/* Trophy or fail icon */}
          <div className={`fc-round-icon ${roundPassed ? "fc-round-icon--win" : "fc-round-icon--fail"}`}>
            {reachedBlind >= BLINDS.length && roundPassed ? "🏆" : roundPassed ? "✅" : "💀"}
          </div>

          <div className="fc-results-score">{score.toLocaleString()}</div>
          <div className="fc-results-label">
            {roundPassed && reachedBlind >= BLINDS.length
              ? "Full Run Complete!"
              : roundPassed
              ? `Passed ${blind.label}`
              : `Failed ${blind.label}`}
          </div>

          <div className="fc-round-stats">
            <div className="fc-round-stat">
              <span className="fc-round-stat-value">{reachedBlind}</span>
              <span className="fc-round-stat-label">
                Blind{reachedBlind !== 1 ? "s" : ""} reached
              </span>
            </div>
            <div className="fc-round-stat">
              <span className="fc-round-stat-value">{summary.correct}</span>
              <span className="fc-round-stat-label">Correct</span>
            </div>
            <div className="fc-round-stat">
              <span className="fc-round-stat-value">{summary.pct}%</span>
              <span className="fc-round-stat-label">Accuracy</span>
            </div>
          </div>

          <div className="fc-results-breakdown">
            {([1, 2, 3, 4] as CardRating[]).map((r) => {
              const count = sessionResults.filter((res) => res.rating === r).length;
              return (
                <div
                  key={r}
                  className="fc-result-chip"
                  style={{
                    borderColor: RATING_COLORS[r],
                    color: RATING_COLORS[r],
                    background: `${RATING_COLORS[r]}14`,
                  }}
                >
                  <div className="fc-result-chip-count">{count}</div>
                  <div className="fc-result-chip-label">{RATING_LABELS[r]}</div>
                </div>
              );
            })}
          </div>

          <div className="fc-results-actions">
            <button className="fc-results-btn fc-results-btn--primary" onClick={handleReplay}>
              <RotateCcw size={16} /> New Round
            </button>
            <button className="fc-results-btn" onClick={() => router.push(`/flashcards?path=${encodeURIComponent(folderPath)}`)}>
              <Home size={16} /> All Decks
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Result message ───────────────────────────────────────────

function ResultMessage({ pct }: { pct: number }) {
  if (pct >= 90) return <p className="fc-results-message fc-results-message--great">Excellent work! 🌟</p>;
  if (pct >= 70) return <p className="fc-results-message fc-results-message--good">Good job! Keep it up.</p>;
  if (pct >= 50) return <p className="fc-results-message fc-results-message--ok">Room to improve — keep studying.</p>;
  return <p className="fc-results-message fc-results-message--retry">These cards need more practice.</p>;
}

// ─── Exported page with Suspense boundary ─────────────────────

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className="flashcard-page">
          <div className="fc-loading">
            <div className="fc-spinner" />
          </div>
        </div>
      }
    >
      <PlayPageInner />
    </Suspense>
  );
}
