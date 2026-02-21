"use client";

import { useState } from "react";
import type { Flashcard } from "@/lib/flashcard-types";

interface FlashcardCardProps {
  card: Flashcard;
  /** Called when the card is clicked to flip */
  onFlip?: (flipped: boolean) => void;
  /** Force-controlled flip state (optional) */
  flipped?: boolean;
}

const SUITS = ["♠", "♥", "♦", "♣"];

function getSuit(cardId: string): string {
  // Deterministic suit from card id
  let hash = 0;
  for (let i = 0; i < cardId.length; i++) {
    hash = (hash * 31 + cardId.charCodeAt(i)) | 0;
  }
  return SUITS[Math.abs(hash) % SUITS.length];
}

export function FlashcardCard({ card, onFlip, flipped: controlledFlipped }: FlashcardCardProps) {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const isFlipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped;
  const suit = getSuit(card.id);

  const handleClick = () => {
    if (controlledFlipped === undefined) {
      const next = !internalFlipped;
      setInternalFlipped(next);
      onFlip?.(next);
    } else {
      onFlip?.(!controlledFlipped);
    }
  };

  return (
    <div className="fc-scene fc-entrance">
      <div
        className={`fc-card${isFlipped ? " flipped" : ""}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? "Card answer (click to flip back)" : "Card question (click to reveal answer)"}
        onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") handleClick(); }}
      >
        {/* ── Front: Question ── */}
        <div className="fc-face fc-face-front">
          <span className="fc-suit">{suit}</span>
          <span className="fc-label">Question</span>
          <p className="fc-text">{card.question}</p>
          <span className="fc-hint">
            <kbd>Space</kbd> to flip
          </span>
        </div>

        {/* ── Back: Answer ── */}
        <div className="fc-face fc-face-back">
          <span className="fc-suit">{suit}</span>
          <span className="fc-label">Answer</span>
          <p className="fc-text">{card.answer}</p>
          <span className="fc-hint">Rate your recall below</span>
        </div>
      </div>
    </div>
  );
}
