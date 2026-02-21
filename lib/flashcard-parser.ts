import * as yaml from "js-yaml";
import { fetchMarkdown } from "./utils";
import type { FlashcardDeck, Flashcard } from "./flashcard-types";

// ─── YAML Shape ───────────────────────────────────────────────

interface RawCard {
  id?: string;
  question: string;
  answer: string;
}

interface RawDeck {
  title: string;
  unit?: string;
  cards: RawCard[];
}

// ─── Slug helpers ─────────────────────────────────────────────

function pathToSlug(filePath: string): string {
  // "flashcards/unit-1.yml" → "unit-1"
  const name = filePath.split("/").pop() ?? filePath;
  return name.replace(/\.[^/.]+$/, "");
}

function generateCardId(deckId: string, index: number): string {
  return `${deckId}-card-${index}`;
}

// ─── Fetch & Parse ────────────────────────────────────────────

/**
 * Fetch and parse a single YAML flashcard deck from GitHub.
 */
export async function fetchFlashcardDeck(
  owner: string,
  repo: string,
  filePath: string,
  options?: { token?: string },
): Promise<FlashcardDeck> {
  const raw = await fetchMarkdown(owner, repo, filePath, options);
  return parseFlashcardYaml(raw, filePath);
}

/**
 * Parse raw YAML text into a FlashcardDeck.
 * Throws if the YAML structure is invalid.
 */
export function parseFlashcardYaml(rawYaml: string, filePath: string): FlashcardDeck {
  const deckId = pathToSlug(filePath);

  let parsed: unknown;
  try {
    parsed = yaml.load(rawYaml);
  } catch (e) {
    throw new Error(`Failed to parse flashcard YAML at "${filePath}": ${e}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Flashcard file "${filePath}" must be a YAML object`);
  }

  const raw = parsed as Partial<RawDeck>;

  if (!raw.title || typeof raw.title !== "string") {
    throw new Error(`Flashcard file "${filePath}" is missing a "title" field`);
  }

  if (!Array.isArray(raw.cards) || raw.cards.length === 0) {
    throw new Error(`Flashcard file "${filePath}" must have a non-empty "cards" array`);
  }

  const cards: Flashcard[] = raw.cards.map((c, i) => {
    if (!c.question || !c.answer) {
      throw new Error(
        `Card at index ${i} in "${filePath}" must have "question" and "answer" fields`,
      );
    }
    return {
      id: c.id ?? generateCardId(deckId, i),
      question: String(c.question),
      answer: String(c.answer),
      deckId,
    };
  });

  return {
    id: deckId,
    title: raw.title,
    unit: raw.unit,
    cards,
    path: filePath,
  };
}

/**
 * Fetch all flashcard decks from a repo's `flashcards/` folder.
 * `flashcardPaths` is a list of file paths like ["flashcards/unit-1.yml", ...].
 */
export async function fetchAllFlashcardDecks(
  owner: string,
  repo: string,
  flashcardPaths: string[],
  options?: { token?: string },
): Promise<FlashcardDeck[]> {
  const results = await Promise.allSettled(
    flashcardPaths.map((path) => fetchFlashcardDeck(owner, repo, path, options)),
  );

  const decks: FlashcardDeck[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      decks.push(result.value);
    } else {
      console.error("Failed to fetch flashcard deck:", result.reason);
    }
  }

  return decks;
}

/**
 * Given a flat repo tree, find all .yml/.yaml files directly inside
 * `basePath` (e.g. "STU 1201/Flashcards").
 *
 * Only returns files that are immediate children of that folder —
 * not nested subdirectories — to avoid accidentally pulling in
 * unrelated YAML files deeper in the tree.
 */
export function extractFlashcardPaths(
  tree: { path: string; type: string }[],
  basePath: string,
): string[] {
  // Normalise: no trailing slash, exact case preserved
  const prefix = basePath.endsWith("/") ? basePath : `${basePath}/`;

  return tree
    .filter((entry) => {
      if (entry.type !== "blob") return false;
      if (!entry.path.startsWith(prefix)) return false;
      if (!entry.path.endsWith(".yml") && !entry.path.endsWith(".yaml")) return false;
      // Must be a direct child — no further slashes after the prefix
      const rest = entry.path.slice(prefix.length);
      return !rest.includes("/");
    })
    .map((entry) => entry.path);
}
