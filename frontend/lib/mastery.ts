export function masteryColorVar(score: number) {
  if (score >= 80) return "var(--mastered)";
  if (score >= 50) return "var(--growing)";
  return "var(--weak)";
}
