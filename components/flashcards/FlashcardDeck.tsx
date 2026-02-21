"use client";

import { useState, useEffect, useCallback } from "react";
import { FlashcardCard } from "./FlashcardCard";
import { applyRating, getCardStats, saveCardStats } from "@/lib/spaced-repetition";
import { RATING_LABELS, RATING_COLORS, type CardRating, type Flashcard } from "@/lib/flashcard-types";

// ─── Interval preview helper ──────────────────────────────────

function previewInterval(cardId: string, rating: CardRating): string {
  const stats = getCardStats(cardId);
  const next = applyRating(stats, rating);
  const days = next.interval;
  if (days < 1) return "<1d";
  if (days === 1) return "1d";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

// ─── Types ────────────────────────────────────────────────────

export interface DeckResult {
  cardId: string;
  rating: CardRating;
}

interface FlashcardDeckProps {
  cards: Flashcard[];
  /** Called when all cards have been rated */
  onComplete: (results: DeckResult[]) => void;
  /** Optional: show blind info (random mode) */
  blindLabel?: string;
  blindThreshold?: number;
  /** Score so far (random mode) */
  score?: number;
  pointMultiplier?: number;
}

// ─── Component ────────────────────────────────────────────────

export function FlashcardDeckPlayer({
  cards,
  onComplete,
  blindLabel,
  blindThreshold,
  score = 0,
  pointMultiplier = 1,
}: FlashcardDeckProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<DeckResult[]>([]);
  const [animating, setAnimating] = useState(false);

  const currentCard = cards[index];
  const progress = index / cards.length;
  const correct = results.filter((r) => r.rating >= 3).length;
  const correctPct = results.length > 0 ? correct / results.length : 0;

  // Keyboard: Space to flip, 1-4 to rate
  const handleRate = useCallback(
    (rating: CardRating) => {
      if (!flipped || animating) return;

      const cardStats = getCardStats(currentCard.id);
      const updated = applyRating(cardStats, rating);
      saveCardStats(updated);

      const newResults = [...results, { cardId: currentCard.id, rating }];

      setAnimating(true);
      setTimeout(() => {
        setResults(newResults);
        if (index + 1 >= cards.length) {
          onComplete(newResults);
        } else {
          setIndex((i) => i + 1);
          setFlipped(false);
          setAnimating(false);
        }
      }, 220);
    },
    [flipped, animating, currentCard, results, index, cards.length, onComplete],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.key === " " || e.key === "Enter") && !flipped) {
        setFlipped(true);
      } else if (e.key === "1") handleRate(1);
      else if (e.key === "2") handleRate(2);
      else if (e.key === "3") handleRate(3);
      else if (e.key === "4") handleRate(4);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flipped, handleRate]);

  if (!currentCard) return null;

  return (
    <div className="fc-deck-player">
      {/* ── HUD ── */}
      <div className="fc-hud">
        <div className="fc-hud-left">
          <span className="fc-hud-count">
            {index + 1} / {cards.length}
          </span>
          {blindLabel && (
            <span className="fc-hud-blind">{blindLabel}</span>
          )}
        </div>

        <div className="fc-hud-center">
          <div className="fc-hud-progress">
            <div
              className="fc-hud-progress-fill"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        <div className="fc-hud-right">
          {blindLabel && blindThreshold != null && (
            <span
              className="fc-hud-threshold"
              style={{
                color: correctPct >= blindThreshold ? "#5c8a6b" : "#c48a5c",
              }}
            >
              {Math.round(correctPct * 100)}% / {Math.round(blindThreshold * 100)}%
            </span>
          )}
          {score > 0 && (
            <span className="fc-hud-score">{score.toLocaleString()}</span>
          )}
        </div>
      </div>

      {/* ── Blind progress bar (random mode) ── */}
      {blindLabel && blindThreshold != null && results.length > 0 && (
        <div className="fc-blind-bar">
          <div className="fc-blind-header">
            <span className="fc-blind-name">{blindLabel}</span>
            <span className="fc-blind-threshold">
              Need {Math.round(blindThreshold * 100)}% correct
            </span>
          </div>
          <div className="fc-blind-track">
            <div
              className="fc-blind-fill"
              style={{ width: `${correctPct * 100}%` }}
            />
            <div
              className="fc-blind-threshold-marker"
              style={{ left: `${blindThreshold * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Card ── */}
      <div className="fc-deck-card-area">
        <FlashcardCard
          key={currentCard.id}
          card={currentCard}
          flipped={flipped}
          onFlip={(f) => setFlipped(f)}
        />
      </div>

      {/* ── Rating buttons (shown after flip) ── */}
      {flipped && (
        <div className="fc-ratings">
          {([1, 2, 3, 4] as CardRating[]).map((rating) => (
            <button
              key={rating}
              className="fc-rating-btn"
              style={{
                borderColor: RATING_COLORS[rating],
                color: RATING_COLORS[rating],
              }}
              onClick={() => handleRate(rating)}
              aria-label={`Rate ${RATING_LABELS[rating]}`}
            >
              <span className="fc-rating-label">{RATING_LABELS[rating]}</span>
              <span className="fc-rating-interval">
                {previewInterval(currentCard.id, rating)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Keyboard hint ── */}
      <p className="fc-keyboard-hint">
        {flipped ? "Press 1–4 to rate" : "Press Space to flip"}
      </p>
    </div>
  );
}
