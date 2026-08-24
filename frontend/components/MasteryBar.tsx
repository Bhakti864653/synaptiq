import { masteryColorVar } from "@/lib/mastery";

export default function MasteryBar({
  score,
  label,
}: {
  score: number;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex items-center justify-between text-sm">
          <span>{label}</span>
          <span className="font-mono text-ink-muted">{score}%</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-line/60">
        <div
          className="h-2 rounded-full transition-[width]"
          style={{
            width: `${Math.max(score, 3)}%`,
            backgroundColor: masteryColorVar(score),
          }}
        />
      </div>
    </div>
  );
}
