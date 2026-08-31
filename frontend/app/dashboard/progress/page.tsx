import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import MasteryBar from "@/components/MasteryBar";
import AccuracyTrendChart from "@/components/AccuracyTrendChart";
import StreakGreeting from "./StreakGreeting";

export default async function ProgressPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: documents } = await supabase
    .from("documents")
    .select("id, filename")
    .order("created_at", { ascending: false });

  const { data: concepts } = await supabase
    .from("concepts")
    .select("id, document_id, name");

  const { data: mastery } = await supabase
    .from("concept_mastery")
    .select("concept_id, mastery_score");

  const { data: responses } = await supabase
    .from("quiz_responses")
    .select("is_correct, answered_at")
    .order("answered_at", { ascending: true });

  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("session_date, questions_answered, correct_answered")
    .order("session_date", { ascending: false })
    .limit(30);

  const sessionDates = new Set((sessions ?? []).map((s) => s.session_date));
  const todayStr = new Date().toISOString().slice(0, 10);
  function addDays(dateStr: string, delta: number) {
    const d = new Date(dateStr + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + delta);
    return d.toISOString().slice(0, 10);
  }
  // A streak still counts as current if today hasn't been studied yet but
  // yesterday was - the day isn't over. It breaks once a full day is skipped.
  let cursor = sessionDates.has(todayStr) ? todayStr : addDays(todayStr, -1);
  let currentStreak = 0;
  while (sessionDates.has(cursor)) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  const masteryByConceptId = new Map(
    (mastery ?? []).map((m) => [m.concept_id, m.mastery_score]),
  );

  const conceptsByDocument = new Map<string, { id: string; name: string }[]>();
  for (const c of concepts ?? []) {
    const list = conceptsByDocument.get(c.document_id) ?? [];
    list.push({ id: c.id, name: c.name });
    conceptsByDocument.set(c.document_id, list);
  }

  const byDay = new Map<string, { correct: number; total: number }>();
  for (const r of responses ?? []) {
    const day = r.answered_at.slice(0, 10);
    const entry = byDay.get(day) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (r.is_correct) entry.correct += 1;
    byDay.set(day, entry);
  }
  const trendPoints = Array.from(byDay.entries()).map(([date, { correct, total }]) => ({
    date,
    accuracy: Math.round((100 * correct) / total),
  }));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-6">
      <StreakGreeting streak={currentStreak} />
      <div className="gradient-hero rounded-2xl p-6">
        <h1 className="text-2xl font-semibold text-ink">Progress</h1>
        <p className="text-sm text-ink-muted">
          How your understanding is trending over time.
        </p>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Study streak</h2>
          <span className="font-mono text-2xl font-bold text-ink">
            {currentStreak}
            <span className="ml-1 text-sm font-normal text-ink-muted">
              day{currentStreak === 1 ? "" : "s"}
            </span>
          </span>
        </div>
        {sessions && sessions.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {sessions.map((s) => (
              <li
                key={s.session_date}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-ink-muted">
                  {(() => {
                    const [y, m, d] = s.session_date.split("-").map(Number);
                    // Construct from local-time parts, not a UTC instant -
                    // session_date is a plain calendar date with no
                    // timezone of its own, so it must render as the same
                    // day everywhere, not shift with the viewer's offset.
                    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    });
                  })()}
                </span>
                <span className="text-ink">
                  {s.correct_answered}/{s.questions_answered} correct
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">
            Answer some quiz questions to start building a streak.
          </p>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-ink">Accuracy over time</h2>
        {trendPoints.length > 0 ? (
          <AccuracyTrendChart points={trendPoints} />
        ) : (
          <p className="text-sm text-ink-muted">
            Answer some quiz questions to start seeing your trend here.
          </p>
        )}
      </Card>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-ink">Mastery by document</h2>
        {documents?.length ? (
          documents.map((doc) => {
            const docConcepts = conceptsByDocument.get(doc.id) ?? [];
            if (!docConcepts.length) return null;
            return (
              <Card key={doc.id} className="flex flex-col gap-3">
                <h3 className="font-medium text-ink">{doc.filename}</h3>
                {docConcepts.map((c) => (
                  <MasteryBar
                    key={c.id}
                    label={c.name}
                    score={masteryByConceptId.get(c.id) ?? 0}
                  />
                ))}
              </Card>
            );
          })
        ) : (
          <p className="text-sm text-ink-muted">No study materials yet.</p>
        )}
      </div>
    </main>
  );
}
