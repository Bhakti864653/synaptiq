import Link from "next/link";
import Mascot, { MascotExpression } from "@/components/Mascot";
import { greetingHeadline, motivationalLine } from "@/lib/greeting";

// The dashboard's editorial opener - typography, thin vertical rules, and
// spacing instead of a row of separate stat cards. Every number here is a
// real query result, not a placeholder; there is deliberately no "study
// time" stat since this schema has no duration/timestamp data to back one
// honestly (only questions answered, streak days, mastery, and material
// count are real).
export default function GreetingHeader({
  name,
  materialCount,
  questionsAnswered,
  streakDays,
  overallMastery,
  isReturningUser,
  mascotExpression,
}: {
  name: string | null;
  materialCount: number;
  questionsAnswered: number;
  streakDays: number;
  overallMastery: number | null;
  isReturningUser: boolean;
  mascotExpression: MascotExpression;
}) {
  const headline = greetingHeadline(name);
  const line = motivationalLine({ streakDays, overallMastery, isReturningUser });

  const stats: { label: string; value: string }[] = [
    { label: "Materials", value: String(materialCount) },
    { label: "Questions answered", value: String(questionsAnswered) },
    { label: "Streak", value: `${streakDays} day${streakDays === 1 ? "" : "s"}` },
  ];
  if (overallMastery !== null) {
    stats.push({ label: "Overall mastery", value: `${overallMastery}%` });
  }

  return (
    <header className="flex flex-col gap-6 border-b border-line pb-6">
      <div className="flex items-center gap-4">
        <Mascot expression={mascotExpression} size={52} className="drop-shadow-md" />
        <div>
          <h1
            className="text-3xl font-medium leading-tight text-ink"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            {headline}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{line}</p>
        </div>
      </div>

      {isReturningUser && (
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          {stats.map((stat, i) => (
            <span key={stat.label} className="flex items-baseline gap-2">
              {i > 0 && <span aria-hidden className="h-4 w-px bg-line" />}
              <span className="font-mono text-lg font-semibold text-ink">{stat.value}</span>
              <span className="text-xs text-ink-muted">{stat.label}</span>
            </span>
          ))}
          <Link
            href="/dashboard/progress"
            className="ml-auto text-xs font-medium text-brand hover:underline"
          >
            View progress &rarr;
          </Link>
        </div>
      )}
    </header>
  );
}
