import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import MasteryBar from "@/components/MasteryBar";
import AccuracyTrendChart from "@/components/AccuracyTrendChart";

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
      <div className="gradient-hero rounded-2xl p-6">
        <h1 className="text-2xl font-semibold text-ink">Progress</h1>
        <p className="text-sm text-ink-muted">
          How your understanding is trending over time.
        </p>
      </div>

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
