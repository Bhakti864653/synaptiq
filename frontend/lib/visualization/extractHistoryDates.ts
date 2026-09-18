// Finds real 4-digit years actually written in a material's own text and
// attaches each one to the real concept it came from - never invents a
// date. A material needs at least 2 distinct dated concepts before a
// timeline is worth showing at all.
export type HistoryEvent = { conceptIndex: number; label: string; year: number };

const YEAR_PATTERN = /\b(1[0-9]{3}|20[0-9]{2})\b/;

export function extractHistoryEvents(
  concepts: { name: string; summary?: string | null; excerpt?: string | null }[],
): HistoryEvent[] {
  const events: HistoryEvent[] = [];
  concepts.forEach((concept, conceptIndex) => {
    const text = `${concept.name} ${concept.summary ?? ""} ${concept.excerpt ?? ""}`;
    const match = text.match(YEAR_PATTERN);
    if (match) {
      events.push({ conceptIndex, label: concept.name, year: Number(match[1]) });
    }
  });
  return events.sort((a, b) => a.year - b.year);
}
