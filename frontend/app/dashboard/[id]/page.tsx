import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuizView from "./QuizView";
import TutorChat from "./TutorChat";

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
    .select("id, filename, status, error_message")
    .eq("id", id)
    .single();

  if (!document) {
    notFound();
  }

  const { data: concepts } = await supabase
    .from("concepts")
    .select("id, name")
    .eq("document_id", id);

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

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <Link href="/dashboard" className="text-sm underline">
        &larr; Back to your materials
      </Link>
      <h1 className="text-2xl font-semibold">{document.filename}</h1>

      {document.status === "error" && (
        <p className="text-sm text-red-600">
          Processing failed: {document.error_message}
        </p>
      )}

      <QuizView
        documentId={document.id}
        status={document.status}
        concepts={concepts ?? []}
        questions={questions ?? []}
        mastery={mastery ?? []}
      />

      {(document.status === "processed" || document.status === "quiz_ready") && (
        <TutorChat documentId={document.id} />
      )}
    </main>
  );
}
