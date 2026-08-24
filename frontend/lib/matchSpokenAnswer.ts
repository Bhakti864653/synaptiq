const LETTER_WORDS: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
const POSITION_WORDS: Record<string, number> = {
  first: 0,
  one: 0,
  "1": 0,
  second: 1,
  two: 1,
  "2": 1,
  third: 2,
  three: 2,
  "3": 2,
  fourth: 3,
  four: 3,
  "4": 3,
};

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

// Matches a spoken transcript to one of a quiz question's four options, either
// by a direct letter/position reference ("B", "option B", "the second one") or,
// failing that, by comparing word overlap against the option text itself
// (for someone who just says the answer instead of a letter). Returns null
// when nothing matches confidently, rather than guessing.
export function matchSpokenAnswer(transcript: string, options: string[]): number | null {
  const words = normalizeWords(transcript);
  if (!words.length) return null;

  const markerIndex = words.findIndex((w) =>
    ["option", "answer", "choice", "letter"].includes(w),
  );
  const afterMarker = markerIndex !== -1 ? words[markerIndex + 1] : undefined;

  if (afterMarker) {
    if (afterMarker in LETTER_WORDS) return LETTER_WORDS[afterMarker];
    if (afterMarker in POSITION_WORDS) return POSITION_WORDS[afterMarker];
  }

  if (words.length <= 3) {
    for (const w of words) {
      if (w in LETTER_WORDS) return LETTER_WORDS[w];
      if (w in POSITION_WORDS) return POSITION_WORDS[w];
    }
  }

  let bestIndex: number | null = null;
  let bestOverlap = 0;
  options.forEach((option, i) => {
    const optionWords = new Set(normalizeWords(option));
    const overlap = words.filter((w) => optionWords.has(w)).length;
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestIndex = i;
    }
  });

  return bestOverlap >= 2 ? bestIndex : null;
}
