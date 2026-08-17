export default function MasteryBar({
  score,
  label,
}: {
  score: number;
  label?: string;
}) {
  const color =
    score >= 80 ? "bg-green-600" : score >= 50 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex items-center justify-between text-sm">
          <span>{label}</span>
          <span className="text-gray-500">{score}%</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${Math.max(score, 3)}%` }}
        />
      </div>
    </div>
  );
}
