import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeCurrentStreak } from "@/lib/streak";
import { nextStepFor } from "@/lib/nextStep";
import Mascot, { MascotExpression } from "@/components/Mascot";
import GreetingHeader from "@/components/dashboard/GreetingHeader";
import NextStepCard from "@/components/dashboard/NextStepCard";
import NeedsAttentionStrip from "@/components/dashboard/NeedsAttentionStrip";
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
  for (const c of concepts ?? []) {
    const ids = conceptsByDocument.get(c.document_id) ?? [];
    ids.push(c.id);
    conceptsByDocument.set(c.document_id, ids);
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

  const nextStep = nextStepFor({
    documents: documents ?? [],
    concepts: concepts ?? [],
    masteryByConceptId,
  });

  if (!isReturningUser) {
    return (
      <main className="syn-page syn-empty mx-auto w-full max-w-6xl px-5 py-10 sm:px-10">
        <div className="syn-empty-grid">
          <div>
            <h1 className="syn-display">Start with your notes.</h1>
            <p className="syn-lead">
              Upload a file or paste your notes. A short quiz will show what you
              already know, and Synaptiq will guide you through the rest.
            </p>
            <section aria-labelledby="next-step-title" className="syn-empty-upload">
              <h2
                id="next-step-title"
                className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted"
              >
                Your next step: upload your first notes
              </h2>
              <DocumentUpload />
            </section>
          </div>
          <div className="syn-empty-art" aria-hidden="true">
            <div className="syn-orbit syn-orbit-one" /><div className="syn-orbit syn-orbit-two" />
            <div className="syn-empty-mascot"><Mascot expression="excited" size={150} /></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="syn-page mx-auto flex w-full max-w-[1500px] flex-col px-5 pb-24 pt-8 sm:px-10 lg:px-14">
      <GreetingHeader
        name={displayName}
        streakDays={currentStreak}
        overallMastery={overallMastery}
        isReturningUser={isReturningUser}
        mascotExpression={heroExpression(overallMastery)}
      />

      {nextStep && <NextStepCard step={nextStep} />}

      {weakSpots.length > 0 && <div className="syn-dashboard-lower">
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
      </div>}

      <section className="syn-library" aria-labelledby="materials-title">
        <div className="syn-library-heading">
          <h2 id="materials-title" className="syn-section-title">Your materials</h2>
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
