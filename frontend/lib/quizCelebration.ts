export type ScoreTier = "perfect" | "great" | "good" | "support";

// Mirrors the Study Guide's own PASS_THRESHOLD (80) for the "great" cutoff -
// scores in that tier are exactly what unlocks the next topic there.
export function getScoreTier(scorePct: number): ScoreTier {
  if (scorePct >= 100) return "perfect";
  if (scorePct >= 80) return "great";
  if (scorePct >= 50) return "good";
  return "support";
}
