"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    days_until_exam: number;
    total_minutes: number;
    plan: PlanItem[];
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-semibold">Exam Mode</h2>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          Exam date
          <input
            type="date"
            required
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Hours/day available
          <input
            type="number"
            min="0.25"
            step="0.25"
            required
            value={hoursPerDay}
            onChange={(e) => setHoursPerDay(e.target.value)}
            className="w-28 rounded border px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Planning..." : "Build study plan"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-500">
            {result.days_until_exam} day
            {result.days_until_exam === 1 ? "" : "s"} until your exam —{" "}
            {formatMinutes(result.total_minutes)} total study time
          </p>
          <ul className="flex flex-col gap-2">
            {result.plan.map((item) => (
              <li
                key={item.concept_id}
                className="flex items-center justify-between rounded border px-3 py-2"
              >
                <div>
                  <div>{item.name}</div>
                  <div className="text-sm text-gray-500">
                    {item.mastery_score}% mastery
                  </div>
                </div>
                <span className="font-medium">
                  {formatMinutes(item.minutes)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
