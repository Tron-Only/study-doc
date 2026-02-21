// ─── Flashcard Data Types ─────────────────────────────────────

/**
 * A single flashcard question/answer pair.
 * The `id` is used to track spaced-repetition stats per card.
 */
export interface Flashcard {
  /** Unique identifier — auto-generated from deck title + index if not in YAML */
  id: string;
  question: string;
  answer: string;
  /** Which deck this card belongs to */
  deckId: string;
}

/**
 * A deck corresponds to one YAML file (e.g. flashcards/unit-1.yml).
 */
export interface FlashcardDeck {
  id: string;          // slug from filename (e.g. "unit-1")
  title: string;       // human-readable title from YAML
  unit?: string;       // optional unit tag
  cards: Flashcard[];
  /** Path in the repo, e.g. "flashcards/unit-1.yml" */
  path: string;
}

// ─── Spaced Repetition Types ──────────────────────────────────

/**
 * Per-card stats stored in localStorage.
 * Follows a simplified SM-2 algorithm (Anki-style).
 */
export interface CardStats {
  id: string;
  /** Ease factor: 1.3 (hard) → 3.0 (easy). Default 2.5 */
  ease: number;
  /** Current review interval in days. Starts at 1. */
  interval: number;
  /** Timestamp (ms) of next due date */
  due: number;
  /** Total number of reviews */
  reviews: number;
  /** Times answered "Again" (hard resets) */
  lapses: number;
  /** Last rating: 1=Again 2=Hard 3=Good 4=Easy */
  lastRating?: 1 | 2 | 3 | 4;
}

/** Rating buttons shown after flipping a card */
export type CardRating = 1 | 2 | 3 | 4;

export const RATING_LABELS: Record<CardRating, string> = {
  1: "Again",
  2: "Hard",
  3: "Good",
  4: "Easy",
};

export const RATING_COLORS: Record<CardRating, string> = {
  1: "#c45c5c",
  2: "#c48a5c",
  3: "#5c7f8a",
  4: "#5c8a6b",
};

// ─── Game Types ───────────────────────────────────────────────

export type GameMode = "unit" | "random";

export interface BlindConfig {
  name: string;
  label: string;       // "Small Blind" | "Big Blind" | "Boss Blind"
  cardCount: number;
  threshold: number;   // Fraction correct needed to pass (e.g. 0.70)
  pointMultiplier: number;
}

export const BLINDS: BlindConfig[] = [
  { name: "small", label: "Small Blind", cardCount: 10, threshold: 0.70, pointMultiplier: 1 },
  { name: "big",   label: "Big Blind",   cardCount: 20, threshold: 0.75, pointMultiplier: 1.5 },
  { name: "boss",  label: "Boss Blind",  cardCount: 30, threshold: 0.80, pointMultiplier: 2 },
];

export interface GameSession {
  mode: GameMode;
  deckId?: string;        // unit mode only
  cards: Flashcard[];
  currentIndex: number;
  results: { cardId: string; rating: CardRating }[];
  /** Random mode only */
  blindIndex?: number;
  score?: number;
  passed?: boolean;
}
