import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WeakestTopics from "@/components/dashboard/WeakestTopics";
import PracticeSession from "./PracticeSession";

export default async function PracticePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: documents } = await supabase
    .from("documents")
    .select("id, filename, status, error_message, processing_started_at")
    .order("created_at", { ascending: false });

  const { data: concepts } = await supabase
    .from("concepts")
    .select("id, document_id, name");

  const { data: mastery } = await supabase
    .from("concept_mastery")
    .select("concept_id, mastery_score");

  const masteryByConceptId = new Map(
    (mastery ?? []).map((m) => [m.concept_id, m.mastery_score]),
  );
  const filenameById = new Map((documents ?? []).map((d) => [d.id, d.filename]));
  const weakest = (concepts ?? [])
    .map((c) => ({ ...c, score: masteryByConceptId.get(c.id) ?? 0 }))
    .filter((c) => c.score > 0 && c.score < 60 && filenameById.has(c.document_id))
    .sort((a, b) => a.score - b.score)
    .map((c) => ({
      id: c.id,
      name: c.name,
      score: c.score,
      documentId: c.document_id,
      filename: filenameById.get(c.document_id) ?? "",
    }));

  return (
    <main className="syn-page mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 pb-20 pt-8 sm:px-10">
      <header className="syn-inner-header">
        <h1 className="syn-section-title">Practice</h1>
        <p className="syn-lead">
          Questions on your weakest topics, from all your materials.
        </p>
      </header>

      <WeakestTopics topics={weakest} />

      <section aria-labelledby="practice-title" className="flex flex-col gap-3">
        <h2 id="practice-title" className="text-lg font-semibold text-ink">
          Practice questions
        </h2>
        <PracticeSession
          initialDocuments={(documents ?? []).map((d) => ({
            id: d.id,
            status: d.status,
            error_message: d.error_message,
            processing_started_at: d.processing_started_at,
          }))}
        />
      </section>
    </main>
  );
}
