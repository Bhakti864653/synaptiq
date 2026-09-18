import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeCurrentStreak } from "@/lib/streak";
import { buildConstellationData } from "@/lib/visualization/buildConstellationData";
import Mascot, { MascotExpression } from "@/components/Mascot";
import GreetingHeader from "@/components/dashboard/GreetingHeader";
import ContinueLearning, { ContinueLearningFocus } from "@/components/dashboard/ContinueLearning";
import NeedsAttentionStrip from "@/components/dashboard/NeedsAttentionStrip";
import KnowledgeConstellation from "@/components/visualization/KnowledgeConstellation";
import DocumentUpload from "./DocumentUpload";
import MaterialsBoard from "./MaterialsBoard";

// Reflects standing progress, not a one-off event (that's what the
// floating MascotCompanion's celebrate() calls are for) - a quiet read of
// "how are things going overall" every time you land here.
function heroExpression(overallMastery: number | null): MascotExpression {
  if (overallMastery === null) return "idle";
  if (overallMastery >= 80) return "celebrating";
  if (overallMastery > 0 && overallMastery < 50) return "encouraging";
  return "idle";
}

// Usable enough to be the "continue learning" focus - a document that's
// still uploading/processing or failed has nothing real to continue with
// yet.
function isUsableForContinueLearning(status: string) {
  return status === "processed" || status === "quiz_ready";
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName = (user.user_metadata?.full_name as string | undefined)?.trim() || null;

  const { data: documents } = await supabase
    .from("documents")
    .select("id, filename, status, error_message, processing_started_at, created_at")
    .order("created_at", { ascending: false });

  const { data: concepts } = await supabase
    .from("concepts")
    .select("id, document_id, name, order_index, summary");

  const { data: mastery } = await supabase
    .from("concept_mastery")
    .select("concept_id, mastery_score");

  const { count: questionsAnswered } = await supabase
    .from("quiz_responses")
    .select("id", { count: "exact", head: true });

  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("session_date")
    .order("session_date", { ascending: false })
    .limit(60);

  const currentStreak = computeCurrentStreak((sessions ?? []).map((s) => s.session_date));

  const masteryByConceptId = new Map(
    (mastery ?? []).map((m) => [m.concept_id, m.mastery_score]),
  );

  const conceptsByDocument = new Map<string, string[]>();
  const conceptsByDocumentFull = new Map<string, typeof concepts>();
  for (const c of concepts ?? []) {
    const ids = conceptsByDocument.get(c.document_id) ?? [];
    ids.push(c.id);
    conceptsByDocument.set(c.document_id, ids);

    const full = conceptsByDocumentFull.get(c.document_id) ?? [];
    full.push(c);
    conceptsByDocumentFull.set(c.document_id, full);
  }

  function averageMastery(conceptIds: string[]) {
    if (!conceptIds.length) return null;
    const total = conceptIds.reduce(
      (sum, id) => sum + (masteryByConceptId.get(id) ?? 0),
      0,
    );
    return Math.round(total / conceptIds.length);
  }

  const allConceptIds = (concepts ?? []).map((c) => c.id);
  const overallMastery = averageMastery(allConceptIds);
  const isReturningUser = (documents?.length ?? 0) > 0;

  const documentById = new Map((documents ?? []).map((d) => [d.id, d]));
  const allWeakSpots = (concepts ?? [])
    .map((c) => ({ ...c, score: masteryByConceptId.get(c.id) ?? 0 }))
    .filter((c) => c.score > 0 && c.score < 60)
    .sort((a, b) => a.score - b.score);
  const weakSpots = allWeakSpots.slice(0, 3);

  // "Continue learning" focus: the most recently touched usable material,
  // and within it, the first concept (by order_index) that isn't already
  // mastered - or simply the first concept if everything is, or none if
  // this material has no concepts extracted yet.
  const continueDocument = (documents ?? []).find((d) => isUsableForContinueLearning(d.status));
  let continueFocus: ContinueLearningFocus | null = null;
  if (continueDocument) {
    const docConcepts = (conceptsByDocumentFull.get(continueDocument.id) ?? [])
      .slice()
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const nextConcept =
      docConcepts.find((c) => (masteryByConceptId.get(c.id) ?? 0) < 80) ?? docConcepts[0] ?? null;
    continueFocus = {
      documentId: continueDocument.id,
      filename: continueDocument.filename,
      conceptName: nextConcept?.name ?? null,
      conceptSummary: nextConcept?.summary ?? null,
      mastery: nextConcept ? masteryByConceptId.get(nextConcept.id) ?? 0 : null,
    };
  }

  const constellationData = buildConstellationData({
    concepts: (concepts ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      document_id: c.document_id,
    })),
    documents: documents ?? [],
    masteryByConceptId,
  });

  if (!isReturningUser) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Mascot expression="excited" size={84} className="drop-shadow-md" />
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold text-ink">
              Let&apos;s get you started
            </h1>
            <p className="text-sm text-ink-muted">
              Upload a file or paste your notes — Synaptiq will turn them into a
              diagnostic quiz and start tracking what you know.
            </p>
          </div>
        </div>
        <DocumentUpload />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 p-6">
      <GreetingHeader
        name={displayName}
        materialCount={documents?.length ?? 0}
        questionsAnswered={questionsAnswered ?? 0}
        streakDays={currentStreak}
        overallMastery={overallMastery}
        isReturningUser={isReturningUser}
        mascotExpression={heroExpression(overallMastery)}
      />

      {/* Deliberately asymmetric, not two equal generic columns - the
          constellation gets real extra room on wide screens so it reads
          as a hero element rather than a sidebar widget. min-w-0 on every
          grid item: without it, CSS Grid's default min-width:auto lets a
          wide child (this constellation's own glow/canvas) force the
          whole track - and the page - wider than the viewport on narrow
          screens, even inside a 1-column grid. */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-start">
        <div className="min-w-0">
          <ContinueLearning focus={continueFocus} />
        </div>
        <div className="min-w-0">
          <KnowledgeConstellation
            data={constellationData}
            emptyHint="Once you upload a material, your concepts will appear here as a constellation."
          />
        </div>
      </div>

      <NeedsAttentionStrip
        items={weakSpots.map((c) => ({
          conceptId: c.id,
          documentId: c.document_id,
          conceptName: c.name,
          filename: documentById.get(c.document_id)?.filename ?? "",
          score: c.score,
        }))}
        totalCount={allWeakSpots.length}
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Your library</h2>
          <DocumentUpload collapsedByDefault />
        </div>
        <MaterialsBoard
          documents={documents!}
          conceptsByDocument={conceptsByDocument}
          masteryByConceptId={masteryByConceptId}
        />
      </div>
    </main>
  );
}
