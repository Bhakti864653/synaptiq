import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DocumentUpload from "./DocumentUpload";
import MaterialCard from "./MaterialCard";

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
    .select("id, document_id");

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
      <div className="gradient-hero flex items-end justify-between gap-4 rounded-2xl p-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Study materials</h1>
          <p className="text-sm text-ink-muted">
            {documents?.length ?? 0} document{documents?.length === 1 ? "" : "s"} ·{" "}
            {questionsAnswered ?? 0} question{questionsAnswered === 1 ? "" : "s"} answered
          </p>
        </div>
        {overallMastery !== null && (
          <Link href="/dashboard/progress" className="group flex flex-col items-end">
            <span
              className="font-mono text-3xl font-bold leading-none text-black"
              style={{ textShadow: "0 1px 4px rgba(255,255,255,0.45)" }}
            >
              {overallMastery}%
            </span>
            <span className="text-xs text-ink-muted group-hover:text-ink">
              overall mastery &rarr;
            </span>
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Your materials</h2>
          <DocumentUpload collapsedByDefault />
        </div>
        <ul className="flex flex-col gap-3">
          {documents!.map((doc) => {
            const docMastery = averageMastery(
              conceptsByDocument.get(doc.id) ?? [],
            );
            return (
              <li key={doc.id}>
                <MaterialCard
                  id={doc.id}
                  filename={doc.filename}
                  status={doc.status}
                  mastery={docMastery}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
