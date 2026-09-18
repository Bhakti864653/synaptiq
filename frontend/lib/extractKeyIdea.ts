// The "one highlighted key idea" for a concept - derived from real,
// already-stored text (summary first, excerpt as a fallback), never
// generated fresh. Returns null rather than a placeholder when neither
// exists yet.
export function extractKeyIdea(summary: string | null, excerpt: string | null): string | null {
  const source = summary?.trim() || excerpt?.trim() || null;
  if (!source) return null;
  const firstSentenceMatch = source.match(/^.*?[.!?](?:\s|$)/);
  const firstSentence = firstSentenceMatch ? firstSentenceMatch[0].trim() : source;
  return firstSentence.length > 220 ? `${firstSentence.slice(0, 217)}...` : firstSentence;
}
