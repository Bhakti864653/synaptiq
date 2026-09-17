// A streak still counts as current if today hasn't been studied yet but
// yesterday was - the day isn't over yet. It breaks once a full day is
// skipped. Extracted from the Progress page's inline calculation so the
// dashboard greeting can share the exact same definition of "streak"
// rather than silently drifting into a second one.
export function computeCurrentStreak(
  sessionDateStrings: string[],
  today: Date = new Date(),
): number {
  const sessionDates = new Set(sessionDateStrings);
  const todayStr = today.toISOString().slice(0, 10);

  function addDays(dateStr: string, delta: number) {
    const d = new Date(dateStr + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + delta);
    return d.toISOString().slice(0, 10);
  }

  let cursor = sessionDates.has(todayStr) ? todayStr : addDays(todayStr, -1);
  let streak = 0;
  while (sessionDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
