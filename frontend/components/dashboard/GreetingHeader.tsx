import Mascot, { MascotExpression } from "@/components/Mascot";
import { greetingHeadline, motivationalLine } from "@/lib/greeting";

// A short hello and one honest line. The numbers (streak, mastery, questions
// answered) live on Progress, so Home can lead straight into the next step.
export default function GreetingHeader({
  name,
  streakDays,
  overallMastery,
  isReturningUser,
  mascotExpression,
}: {
  name: string | null;
  streakDays: number;
  overallMastery: number | null;
  isReturningUser: boolean;
  mascotExpression: MascotExpression;
}) {
  const headline = greetingHeadline(name);
  const line = motivationalLine({ streakDays, overallMastery, isReturningUser });

  return (
    <header className="syn-dashboard-header syn-greeting-short">
      <div className="syn-greeting-row">
        <div>
          <h1 className="syn-display">{headline}</h1>
          <p className="syn-lead">{line}</p>
        </div>
        <div className="syn-greeting-mascot"><Mascot expression={mascotExpression} size={84} className="drop-shadow-md" /></div>
      </div>
    </header>
  );
}
