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
      <main className="syn-page syn-empty mx-auto w-full max-w-6xl px-5 py-10 sm:px-10">
        <div className="syn-eyebrow">Your learning space / 01</div>
        <div className="syn-empty-grid">
          <div>
            <h1 className="syn-display">Every idea starts <em>somewhere.</em></h1>
            <p className="syn-lead">Bring in a file or paste your notes. Synaptiq will help you see what you know, find the gaps, and make your next move.</p>
            <div className="syn-empty-upload"><DocumentUpload /></div>
          </div>
          <div className="syn-empty-art" aria-hidden="true">
            <div className="syn-orbit syn-orbit-one" /><div className="syn-orbit syn-orbit-two" />
            <div className="syn-empty-mascot"><Mascot expression="excited" size={150} /></div>
            <span className="syn-art-label syn-art-label-one">01 / Add material</span>
            <span className="syn-art-label syn-art-label-two">02 / Discover connections</span>
            <span className="syn-art-label syn-art-label-three">03 / Learn what matters</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="syn-page mx-auto flex w-full max-w-[1500px] flex-col px-5 pb-24 pt-8 sm:px-10 lg:px-14">
      <GreetingHeader
        name={displayName}
        materialCount={documents?.length ?? 0}
        questionsAnswered={questionsAnswered ?? 0}
        streakDays={currentStreak}
        overallMastery={overallMastery}
        isReturningUser={isReturningUser}
        mascotExpression={heroExpression(overallMastery)}
      />

      <section className="syn-map-section" aria-label="Your learning map">
        <div className="syn-map-heading">
          <div><span className="syn-eyebrow">01 / The big picture</span><h2 className="syn-section-title">Where knowledge <em>connects.</em></h2></div>
          <p>Each point is a concept from your materials. Explore the connections, then choose where to go next.</p>
        </div>
        <div className="syn-map-stage">
          <span className="syn-stage-stamp" aria-hidden="true">YOUR IDEAS / IN MOTION</span>
          <KnowledgeConstellation
            data={constellationData}
            emptyHint="Once you upload a material, your concepts will appear here as a constellation."
          />
        </div>
      </section>

      <div className="syn-dashboard-lower">
        <div className="syn-next-panel"><ContinueLearning focus={continueFocus} /></div>
        <div className="syn-attention-panel"><NeedsAttentionStrip
          items={weakSpots.map((c) => ({
            conceptId: c.id,
            documentId: c.document_id,
            conceptName: c.name,
            filename: documentById.get(c.document_id)?.filename ?? "",
            score: c.score,
          }))}
          totalCount={allWeakSpots.length}
        /></div>
      </div>

      <section className="syn-library">
        <div className="syn-library-heading">
          <div><span className="syn-eyebrow">02 / Your collection</span><h2 className="syn-section-title">The material <em>behind it.</em></h2></div>
          <DocumentUpload collapsedByDefault />
        </div>
        <MaterialsBoard
          documents={documents!}
          conceptsByDocument={conceptsByDocument}
          masteryByConceptId={masteryByConceptId}
        />
      </section>
    </main>
  );
}
