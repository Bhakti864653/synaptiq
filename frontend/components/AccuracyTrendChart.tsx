import TrendChart from "@/components/TrendChart";

type Point = { date: string; accuracy: number };

export default function AccuracyTrendChart({ points }: { points: Point[] }) {
  return (
    <TrendChart points={points.map((p) => ({ date: p.date, value: p.accuracy }))} />
  );
}
