/**
 * Spaced Repetition — Simplified SM-2 algorithm (Anki-style)
 *
 * Rating scale:
 *   1 = Again  → Hard reset, add to lapses, ease drops sharply
 *   2 = Hard   → Short interval, ease drops slightly
 *   3 = Good   → Normal progression
 *   4 = Easy   → Larger jump, ease increases
 */

import type { CardStats, CardRating, Flashcard } from "./flashcard-types";

// ─── Constants ─────────────────────────────────────────────────

const STORAGE_KEY = "study-doc:card-stats";
const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;
const DAY_MS = 86_400_000;

// ─── Storage ───────────────────────────────────────────────────

export function loadAllStats(): Record<string, CardStats> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, CardStats>;
  } catch {
    return {};
  }
}

export function saveAllStats(stats: Record<string, CardStats>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {}
}

export function getCardStats(cardId: string): CardStats {
  const all = loadAllStats();
  return (
    all[cardId] ?? {
      id: cardId,
      ease: DEFAULT_EASE,
      interval: 1,
      due: Date.now(),
      reviews: 0,
      lapses: 0,
    }
  );
}

export function saveCardStats(stats: CardStats): void {
  const all = loadAllStats();
  all[stats.id] = stats;
  saveAllStats(all);
}

export function saveBatchStats(updates: CardStats[]): void {
  const all = loadAllStats();
  for (const s of updates) {
    all[s.id] = s;
  }
  saveAllStats(all);
}

// ─── SM-2 Core ─────────────────────────────────────────────────

/**
 * Calculate updated card stats after a review.
 *
 * SM-2 formula adapted for 4-button Anki-style ratings.
 */
export function applyRating(stats: CardStats, rating: CardRating): CardStats {
  const now = Date.now();
  const next = { ...stats, reviews: stats.reviews + 1, lastRating: rating };

  switch (rating) {
    case 1: {
      // Again — hard reset
      next.lapses += 1;
      next.ease = Math.max(MIN_EASE, stats.ease - 0.20);
      next.interval = 1;
      next.due = now + DAY_MS;
      break;
    }
    case 2: {
      // Hard — short interval, ease drops slightly
      next.ease = Math.max(MIN_EASE, stats.ease - 0.15);
      const newInterval = Math.max(1, Math.round(stats.interval * 1.2));
      next.interval = newInterval;
      next.due = now + newInterval * DAY_MS;
      break;
    }
    case 3: {
      // Good — standard SM-2
      const newInterval =
        stats.reviews <= 1
          ? 1
          : stats.reviews === 2
          ? 6
          : Math.round(stats.interval * stats.ease);
      next.interval = newInterval;
      next.due = now + newInterval * DAY_MS;
      // ease unchanged
      break;
    }
    case 4: {
      // Easy — large jump, ease increases
      next.ease = Math.min(3.0, stats.ease + 0.15);
      const newInterval =
        stats.reviews <= 1
          ? 4
          : Math.round(stats.interval * stats.ease * 1.3);
      next.interval = newInterval;
      next.due = now + newInterval * DAY_MS;
      break;
    }
  }

  return next;
}

// ─── Card Selection ────────────────────────────────────────────

/**
 * Calculate a selection weight for a card in random/weighted mode.
 * Higher weight = more likely to be picked.
 *
 * Factors:
 * - Low ease → harder card → picked more
 * - Many lapses → struggles → picked more
 * - Overdue (past due date) → picked more
 */
export function cardWeight(stats: CardStats): number {
  const now = Date.now();
  const overdueFactor = stats.due <= now ? 1.5 : 1.0;
  const lapseFactor = 1 + stats.lapses * 0.4;
  const easeFactor = 1 / stats.ease;
  return easeFactor * lapseFactor * overdueFactor;
}

/**
 * Weighted random selection of `count` cards from `pool`.
 * Cards with higher weights appear more often.
 */
export function weightedSelect(pool: Flashcard[], count: number): Flashcard[] {
  if (pool.length === 0) return [];
  if (pool.length <= count) return [...pool].sort(() => Math.random() - 0.5);

  const allStats = loadAllStats();
  const weights = pool.map((c) => {
    const stats = allStats[c.id] ?? {
      id: c.id,
      ease: DEFAULT_EASE,
      interval: 1,
      due: Date.now(),
      reviews: 0,
      lapses: 0,
    };
    return cardWeight(stats);
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const selected: Flashcard[] = [];
  const used = new Set<number>();

  while (selected.length < count && used.size < pool.length) {
    let rand = Math.random() * totalWeight;
    for (let i = 0; i < pool.length; i++) {
      if (used.has(i)) continue;
      rand -= weights[i];
      if (rand <= 0) {
        selected.push(pool[i]);
        used.add(i);
        break;
      }
    }
  }

  return selected;
}

/**
 * Sort cards for unit mode: overdue first, then by ease ascending (hardest first).
 */
export function sortForUnitMode(cards: Flashcard[]): Flashcard[] {
  const allStats = loadAllStats();
  const now = Date.now();

  return [...cards].sort((a, b) => {
    const sa = allStats[a.id];
    const sb = allStats[b.id];
    if (!sa && !sb) return 0;
    if (!sa) return 1;
    if (!sb) return -1;

    const aDue = sa.due <= now ? 0 : sa.due;
    const bDue = sb.due <= now ? 0 : sb.due;
    if (aDue !== bDue) return aDue - bDue;

    return sa.ease - sb.ease;
  });
}

/**
 * Return a summary of stats for a completed session.
 */
export function sessionSummary(results: { cardId: string; rating: CardRating }[]) {
  const again = results.filter((r) => r.rating === 1).length;
  const hard = results.filter((r) => r.rating === 2).length;
  const good = results.filter((r) => r.rating === 3).length;
  const easy = results.filter((r) => r.rating === 4).length;
  const total = results.length;
  const correct = good + easy;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  return { again, hard, good, easy, total, correct, pct };
}
