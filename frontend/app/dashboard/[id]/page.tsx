import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ExamPlan from "./ExamPlan";
import Flashcards from "./Flashcards";
import QuizView from "./QuizView";
import TutorChat from "./TutorChat";
import DocumentTabs from "./DocumentTabs";
import ForwardPassDemo from "./ForwardPassDemo";
import ActivationPlayground from "./ActivationPlayground";
import { SAMPLE_FILENAME } from "@/lib/demoContent";

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

  const tabs = [
    {
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
    },
  ];

  if (document.status === "processed" || document.status === "quiz_ready") {
    tabs.push({
      id: "tutor",
      label: "Tutor",
      content: <TutorChat documentId={document.id} />,
    });
  }

  if (document.status === "quiz_ready") {
    tabs.push({
      id: "exam",
      label: "Exam Mode",
      content: <ExamPlan documentId={document.id} />,
    });
    tabs.push({
      id: "flashcards",
      label: "Flashcards",
      content: <Flashcards documentId={document.id} />,
    });
  }

  if (user.user_metadata?.is_demo === true && document.filename === SAMPLE_FILENAME) {
    tabs.push({
      id: "forward-pass",
      label: "Forward Pass",
      content: <ForwardPassDemo />,
    });
    tabs.push({
      id: "activations",
      label: "Activations",
      content: <ActivationPlayground />,
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="gradient-hero rounded-2xl p-6">
        <Link
          href="/dashboard"
          className="w-fit text-sm text-ink-muted hover:text-ink"
        >
          &larr; Back to your materials
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink">{document.filename}</h1>
      </div>

      {document.status === "error" && (
        <p className="text-sm text-weak">
          Processing failed: {document.error_message}
        </p>
      )}

      <DocumentTabs tabs={tabs} />
    </main>
  );
}
