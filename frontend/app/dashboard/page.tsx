import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MasteryBar from "@/components/MasteryBar";
import DocumentUpload from "./DocumentUpload";
import LogoutButton from "./LogoutButton";

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
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your study materials</h1>
        <LogoutButton />
      </div>

      {documents?.length ? (
        <div className="flex flex-col gap-3 rounded border p-4">
          <h2 className="font-semibold">Overview</h2>
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="text-xl font-semibold">{documents.length}</div>
              <div className="text-gray-500">documents</div>
            </div>
            <div>
              <div className="text-xl font-semibold">
                {allConceptIds.length}
              </div>
              <div className="text-gray-500">concepts tracked</div>
            </div>
            <div>
              <div className="text-xl font-semibold">
                {questionsAnswered ?? 0}
              </div>
              <div className="text-gray-500">questions answered</div>
            </div>
          </div>
          {overallMastery !== null && (
            <MasteryBar score={overallMastery} label="Overall mastery" />
          )}
        </div>
      ) : null}

      <DocumentUpload />

      <ul className="flex flex-col gap-2">
        {documents?.length ? (
          documents.map((doc) => {
            const docMastery = averageMastery(
              conceptsByDocument.get(doc.id) ?? [],
            );
            return (
              <li key={doc.id}>
                <Link
                  href={`/dashboard/${doc.id}`}
                  className="flex flex-col gap-2 rounded border px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <div className="flex items-center justify-between">
                    <span>{doc.filename}</span>
                    <span className="text-sm text-gray-500">
                      {doc.status}
                    </span>
                  </div>
                  {docMastery !== null && <MasteryBar score={docMastery} />}
                </Link>
              </li>
            );
          })
        ) : (
          <p className="text-sm text-gray-500">
            No documents uploaded yet.
          </p>
        )}
      </ul>
    </main>
  );
}
