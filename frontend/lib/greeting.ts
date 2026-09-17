// Pure, testable pieces behind the dashboard's editorial greeting header -
// kept separate from the component so the copy logic can be verified
// without rendering anything.
export function timeOfDayGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function greetingHeadline(name: string | null, date: Date = new Date()): string {
  const greeting = timeOfDayGreeting(date);
  return name ? `${greeting}, ${name}` : greeting;
}

// One concise, honest line - never generic filler, and never claiming
// progress that the data doesn't support. Streak takes priority when it's
// genuinely notable (matches the mascot's own >= 2-day threshold elsewhere
// in the app); otherwise falls back to a mastery-appropriate note.
export function motivationalLine({
  streakDays,
  overallMastery,
  isReturningUser,
}: {
  streakDays: number;
  overallMastery: number | null;
  isReturningUser: boolean;
}): string {
  if (!isReturningUser) {
    return "Upload your first material and let's see what you actually know.";
  }
  if (streakDays >= 2) {
    return `${streakDays}-day streak - keep the momentum going.`;
  }
  if (overallMastery === null) {
    return "Answer a few questions to start tracking real understanding.";
  }
  if (overallMastery >= 80) {
    return "You're deep into mastery territory on this material.";
  }
  if (overallMastery < 50) {
    return "Steady, focused practice beats cramming - let's keep at it.";
  }
  return "You're building real momentum here.";
}
