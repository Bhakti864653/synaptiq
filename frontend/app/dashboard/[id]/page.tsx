import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { masteryColorVar } from "@/lib/mastery";
import TopicVisualization from "@/components/visualization/TopicVisualization";
import Flashcards from "./Flashcards";
import QuizView from "./QuizView";
import StudyGuide from "./StudyGuide";
import TutorChat from "./TutorChat";
import DocumentTabs from "./DocumentTabs";
import DocumentStatusWatcher from "./DocumentStatusWatcher";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: document } = await supabase
    .from("documents")
    .select(
      "id, filename, status, error_message, processing_started_at, exam_date, hours_per_day",
    )
    .eq("id", id)
    .single();

  if (!document) {
    notFound();
  }

  const { data: concepts } = await supabase
    .from("concepts")
    .select("id, name, order_index, summary, excerpt, scheduled_date")
    .eq("document_id", id)
    .order("order_index");

  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("id, concept_id, question_text, options")
    .eq("document_id", id);

  const conceptIds = concepts?.map((c) => c.id) ?? [];
  const { data: mastery } = conceptIds.length
    ? await supabase
        .from("concept_mastery")
        .select("concept_id, mastery_score")
        .in("concept_id", conceptIds)
    : { data: [] };

  const tabs = [];

  if (document.status === "processed" || document.status === "quiz_ready") {
    tabs.push({
      id: "study-guide",
      label: "Study Guide",
      content: (
        <StudyGuide
          documentId={document.id}
          concepts={concepts ?? []}
          mastery={mastery ?? []}
          examDate={document.exam_date}
          hoursPerDay={document.hours_per_day}
        />
      ),
    });
  }

  tabs.push({
    id: "quiz",
    label: "Quiz",
    content: (
      <QuizView
        documentId={document.id}
        status={document.status}
        concepts={concepts ?? []}
        questions={questions ?? []}
        mastery={mastery ?? []}
      />
    ),
  });

  if (document.status === "processed" || document.status === "quiz_ready") {
    tabs.push({
      id: "tutor",
      label: "Tutor",
      content: <TutorChat documentId={document.id} />,
    });
  }

  if (document.status === "quiz_ready") {
    tabs.push({
      id: "flashcards",
      label: "Flashcards",
      content: <Flashcards documentId={document.id} />,
    });
  }

  const conceptCount = concepts?.length ?? 0;
  const masteryByConceptId = new Map((mastery ?? []).map((m) => [m.concept_id, m.mastery_score]));
  const scoredMastery = (concepts ?? [])
    .map((c) => masteryByConceptId.get(c.id))
    .filter((s): s is number => typeof s === "number");
  const overallMastery = scoredMastery.length
    ? Math.round(scoredMastery.reduce((sum, s) => sum + s, 0) / scoredMastery.length)
    : null;
  const currentFocus =
    (concepts ?? []).find((c) => (masteryByConceptId.get(c.id) ?? 0) < 80) ?? concepts?.[0];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-1 border-b border-line pb-5">
        <Link href="/dashboard" className="w-fit text-sm text-ink-muted hover:text-ink">
          &larr; Back to your library
        </Link>
        <h1
          className="mt-1 text-3xl font-medium text-ink"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          {document.filename}
        </h1>
        {conceptCount > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
            <span>
              {conceptCount} concept{conceptCount === 1 ? "" : "s"}
            </span>
            {overallMastery !== null && (
              <>
                <span aria-hidden className="h-3.5 w-px bg-line" />
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: masteryColorVar(overallMastery) }}
                  />
                  {overallMastery}% mastery
                </span>
              </>
            )}
            {currentFocus && (
              <>
                <span aria-hidden className="h-3.5 w-px bg-line" />
                <span>Currently on: {currentFocus.name}</span>
              </>
            )}
          </div>
        )}
      </div>

      <DocumentStatusWatcher
        key={document.id}
        id={document.id}
        status={document.status}
        errorMessage={document.error_message}
        processingStartedAt={document.processing_started_at}
      />

      {conceptCount > 0 && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[200px_1fr]">
          <nav aria-label="Concepts in this material" className="hidden lg:block">
            <ul className="flex flex-col gap-1 border-l border-line pl-3">
              {(concepts ?? []).map((c) => {
                const score = masteryByConceptId.get(c.id) ?? null;
                return (
                  <li key={c.id} className="flex items-center gap-2 py-1 text-sm">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: score === null ? "var(--line)" : masteryColorVar(score),
                      }}
                    />
                    <span className="truncate text-ink-muted">{c.name}</span>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex flex-col gap-8">
            <TopicVisualization
              documentId={document.id}
              filename={document.filename}
              concepts={(concepts ?? []).map((c) => ({ id: c.id, name: c.name }))}
              masteryByConceptId={masteryByConceptId}
            />
            <DocumentTabs tabs={tabs} />
          </div>
        </div>
      )}

      {conceptCount === 0 && <DocumentTabs tabs={tabs} />}
    </main>
  );
}
