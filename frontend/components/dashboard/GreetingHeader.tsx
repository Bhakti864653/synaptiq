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
    <header className="syn-dashboard-header">
      <div className="syn-eyebrow">Synaptiq / Your learning studio</div>
      <div className="syn-greeting-row">
        <div>
          <h1 className="syn-display">{headline}</h1>
          <p className="syn-lead">{line}</p>
        </div>
        <div className="syn-greeting-mascot"><Mascot expression={mascotExpression} size={100} className="drop-shadow-md" /></div>
      </div>

      {isReturningUser && (
        <div className="syn-stats">
          {stats.map((stat) => (
            <span key={stat.label} className="syn-stat">
              <span className="syn-stat-value">{stat.value}</span>
              <span className="syn-stat-label">{stat.label}</span>
            </span>
          ))}
          <Link
            href="/dashboard/progress"
            className="syn-stats-link"
          >
            View your progress <span aria-hidden="true">↗</span>
          </Link>
        </div>
      )}
    </header>
  );
}
