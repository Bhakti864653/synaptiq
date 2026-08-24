import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MasteryBar from "@/components/MasteryBar";
import Card from "@/components/Card";
import DocumentUpload from "./DocumentUpload";

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

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-ink">Your study materials</h1>

      {documents?.length ? (
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink">Overview</h2>
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="font-mono text-xl font-semibold text-ink">
                {documents.length}
              </div>
              <div className="text-ink-muted">documents</div>
            </div>
            <div>
              <div className="font-mono text-xl font-semibold text-ink">
                {allConceptIds.length}
              </div>
              <div className="text-ink-muted">concepts tracked</div>
            </div>
            <div>
              <div className="font-mono text-xl font-semibold text-ink">
                {questionsAnswered ?? 0}
              </div>
              <div className="text-ink-muted">questions answered</div>
            </div>
          </div>
          {overallMastery !== null && (
            <MasteryBar score={overallMastery} label="Overall mastery" />
          )}
        </Card>
      ) : null}

      <DocumentUpload />

      <ul className="flex flex-col gap-3">
        {documents?.length ? (
          documents.map((doc) => {
            const docMastery = averageMastery(
              conceptsByDocument.get(doc.id) ?? [],
            );
            return (
              <li key={doc.id}>
                <Link href={`/dashboard/${doc.id}`}>
                  <Card className="flex flex-col gap-2 transition-colors hover:bg-line/30">
                    <div className="flex items-center justify-between">
                      <span className="text-ink">{doc.filename}</span>
                      <span className="font-mono text-sm text-ink-muted">
                        {doc.status}
                      </span>
                    </div>
                    {docMastery !== null && <MasteryBar score={docMastery} />}
                  </Card>
                </Link>
              </li>
            );
          })
        ) : (
          <p className="text-sm text-ink-muted">No documents uploaded yet.</p>
        )}
      </ul>
    </main>
  );
}
