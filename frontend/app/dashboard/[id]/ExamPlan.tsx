"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyErrorMessage } from "@/lib/friendlyError";
import ErrorMessage from "@/components/ErrorMessage";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Card from "@/components/Card";

type PlanItem = {
  concept_id: string;
  name: string;
  mastery_score: number;
  minutes: number;
};

async function authFetch(path: string, options: RequestInit = {}) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not logged in");

  return fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${session.access_token}`,
    },
  });
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export default function ExamPlan({ documentId }: { documentId: string }) {
  const [examDate, setExamDate] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(
    null,
  );
  const [result, setResult] = useState<{
    days_until_exam: number;
    total_minutes: number;
    plan: PlanItem[];
  } | null>(null);

  async function buildPlan() {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/documents/${documentId}/exam-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_date: examDate,
          hours_per_day: parseFloat(hoursPerDay),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed (${res.status})`);
      }
      setResult(await res.json());
    } catch (e) {
      setError({ message: friendlyErrorMessage(e), retry: buildPlan });
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    buildPlan();
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-semibold text-ink">Exam Mode</h2>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm text-ink">
          Exam date
          <Input
            type="date"
            required
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-ink">
          Hours/day available
          <Input
            type="number"
            min="0.25"
            step="0.25"
            required
            value={hoursPerDay}
            onChange={(e) => setHoursPerDay(e.target.value)}
            className="w-28"
          />
        </label>
        <Button type="submit" disabled={loading}>
          {loading ? "Planning..." : "Build study plan"}
        </Button>
      </form>

      {error && <ErrorMessage message={error.message} onRetry={error.retry} />}

      {result && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink-muted">
            {result.days_until_exam} day
            {result.days_until_exam === 1 ? "" : "s"} until your exam —{" "}
            <span className="font-mono">{formatMinutes(result.total_minutes)}</span>{" "}
            total study time
          </p>
          <ul className="flex flex-col gap-2">
            {result.plan.map((item) => (
              <li key={item.concept_id}>
                <Card
                  mastery={item.mastery_score}
                  className="flex items-center justify-between"
                >
                  <div>
                    <div className="text-ink">{item.name}</div>
                    <div className="font-mono text-sm text-ink-muted">
                      {item.mastery_score}% mastery
                    </div>
                  </div>
                  <span className="font-mono font-medium text-ink">
                    {formatMinutes(item.minutes)}
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
