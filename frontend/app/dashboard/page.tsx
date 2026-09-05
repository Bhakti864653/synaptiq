import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import Mascot from "@/components/Mascot";
import HeroDots from "@/components/HeroDots";
import { masteryColorVar } from "@/lib/mastery";
import DocumentUpload from "./DocumentUpload";
import MaterialCard from "./MaterialCard";

// Reflects standing progress, not a one-off event (that's what the
// floating MascotCompanion's celebrate() calls are for) - a quiet read of
// "how are things going overall" every time you land here.
function heroExpression(overallMastery: number | null) {
  if (overallMastery === null) return "idle" as const;
  if (overallMastery >= 80) return "celebrating" as const;
  if (overallMastery > 0 && overallMastery < 50) return "encouraging" as const;
  return "idle" as const;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: documents } = await supabase
    .from("documents")
    .select("id, filename, status, created_at")
    .order("created_at", { ascending: false });

  const { data: concepts } = await supabase
    .from("concepts")
    .select("id, document_id, name");

  const { data: mastery } = await supabase
    .from("concept_mastery")
    .select("concept_id, mastery_score");

  const { count: questionsAnswered } = await supabase
    .from("quiz_responses")
    .select("id", { count: "exact", head: true });

  const masteryByConceptId = new Map(
    (mastery ?? []).map((m) => [m.concept_id, m.mastery_score]),
  );

  const conceptsByDocument = new Map<string, string[]>();
  for (const c of concepts ?? []) {
    const list = conceptsByDocument.get(c.document_id) ?? [];
    list.push(c.id);
    conceptsByDocument.set(c.document_id, list);
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

  // Surface weak spots unprompted, right on the page a returning user lands
  // on. Only concepts with real (if low) evidence of an attempt qualify -
  // a concept nobody has touched yet defaults to the same 0 score and
  // isn't a "weak spot" so much as a "not started yet" one.
  const documentById = new Map((documents ?? []).map((d) => [d.id, d]));
  const allWeakSpots = (concepts ?? [])
    .map((c) => ({ ...c, score: masteryByConceptId.get(c.id) ?? 0 }))
    .filter((c) => c.score > 0 && c.score < 60)
    .sort((a, b) => a.score - b.score);
  const weakSpots = allWeakSpots.slice(0, 3);

  if (!isReturningUser) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-ink">
            Let&apos;s get you started
          </h1>
          <p className="text-sm text-ink-muted">
            Upload a file or paste your notes — Synaptiq will turn them into a
            diagnostic quiz and start tracking what you know.
          </p>
        </div>
        <DocumentUpload />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-6">
      <div className="gradient-hero relative flex items-end justify-between gap-4 overflow-hidden rounded-2xl p-6 sm:p-8">
        <HeroDots />
        <div className="relative">
          <h1 className="text-3xl font-semibold text-ink">Study materials</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {documents?.length ?? 0} document{documents?.length === 1 ? "" : "s"} ·{" "}
            {questionsAnswered ?? 0} question{questionsAnswered === 1 ? "" : "s"} answered
          </p>
        </div>
        {overallMastery !== null && (
          <Link
            href="/dashboard/progress"
            className="group relative flex items-center gap-3"
          >
            <Mascot expression={heroExpression(overallMastery)} size={60} className="drop-shadow-md" />
            <div className="flex flex-col items-end">
              <span
                className="font-mono text-3xl font-bold leading-none text-black"
                style={{ textShadow: "0 1px 4px rgba(255,255,255,0.45)" }}
              >
                {overallMastery}%
              </span>
              <span className="text-xs text-ink-muted group-hover:text-ink">
                overall mastery &rarr;
              </span>
            </div>
          </Link>
        )}
      </div>

      {weakSpots.length > 0 && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink">Weak spots to revisit</h2>
          <ul className="flex flex-col gap-2">
            {weakSpots.map((c) => {
              const doc = documentById.get(c.document_id);
              if (!doc) return null;
              return (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/${doc.id}`}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 -mx-2 hover:bg-line/40"
                  >
                    <span className="text-sm text-ink">
                      {c.name}
                      <span className="text-ink-muted"> · {doc.filename}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: masteryColorVar(c.score) }}
                      />
                      {c.score}%
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {allWeakSpots.length > weakSpots.length && (
            <Link
              href="/dashboard/weak-spots"
              className="self-start text-xs text-ink-muted hover:text-ink"
            >
              See all {allWeakSpots.length} &rarr;
            </Link>
          )}
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Your materials</h2>
          <DocumentUpload collapsedByDefault />
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {documents!.map((doc, i) => {
            const docMastery = averageMastery(
              conceptsByDocument.get(doc.id) ?? [],
            );
            const featured = i === 0;
            return (
              <li key={doc.id} className={featured ? "sm:col-span-2" : undefined}>
                <MaterialCard
                  id={doc.id}
                  filename={doc.filename}
                  status={doc.status}
                  mastery={docMastery}
                  featured={featured}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
