import type { MascotExpression } from "@/components/Mascot";

const PASS_THRESHOLD = 80;

// Playful lines for when someone just clicks the mascot out of curiosity -
// not tied to any study event, so no expression logic needed beyond "happy
// to see you."
const CLICK_QUIPS = [
  "Hi! I'm Spark.",
  "Poke me all you want, I don't mind.",
  "Synapses firing, all systems go!",
  "Ready to learn something today?",
  "*happy brain noises*",
  "Knowledge is just a click away.",
];

export function randomClickQuip(): string {
  return CLICK_QUIPS[Math.floor(Math.random() * CLICK_QUIPS.length)];
}

// Shared "just submitted a batch of quiz answers" reaction, used anywhere
// a submit produces a plain correct/incorrect result list (diagnostic
// quiz, weak-concept practice, cross-document practice) - the Study Guide
// topic quiz has its own richer per-topic version of this.
export function celebrateFromResults(
  celebrate: (expression: MascotExpression, message: string) => void,
  results: { is_correct: boolean }[],
  label: string,
) {
  if (results.length === 0) return;
  const correct = results.filter((r) => r.is_correct).length;
  const pct = Math.round((100 * correct) / results.length);

  if (pct >= PASS_THRESHOLD) {
    celebrate(
      "celebrating",
      pct === 100 ? `Perfect on ${label}!` : `${pct}% on ${label} — great work!`,
    );
  } else {
    celebrate("encouraging", `${pct}% on ${label} — review and try again anytime.`);
  }
}
