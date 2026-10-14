import { recommendedStep, type MaterialStep } from "./learningJourney";

// Home's single "Your next step": one action, chosen from the student's
// real materials and mastery, that opens the material page on the right
// step. Pure so the choice can be tested without rendering anything.
export type NextStep = {
  action: string;
  detail: string;
  href: string;
};

type Doc = { id: string; filename: string; status: string };
type Concept = { id: string; document_id: string; name: string; order_index: number | null };

const ACTION: Record<MaterialStep, (topic: string) => string> = {
  quiz: (t) => `Take the quiz on ${t}`,
  "study-guide": (t) => `Continue studying ${t}`,
  practice: (t) => `Practice ${t}`,
  flashcards: (t) => `Review flashcards for ${t}`,
};

export function nextStepFor({
  documents,
  concepts,
  masteryByConceptId,
}: {
  documents: Doc[];
  concepts: Concept[];
  masteryByConceptId: Map<string, number>;
}): NextStep | null {
  if (documents.length === 0) return null;

  const usable = documents.find((d) => d.status === "processed" || d.status === "quiz_ready");
  if (!usable) {
    const doc = documents[0];
    const failed = doc.status === "failed";
    return {
      action: failed ? `Fix ${doc.filename}` : `Check on ${doc.filename}`,
      detail: failed
        ? "Something went wrong preparing these notes. You can retry from the material page."
        : "Your notes are still being prepared. This usually takes a minute.",
      href: `/dashboard/${doc.id}`,
    };
  }

  const docConcepts = concepts
    .filter((c) => c.document_id === usable.id)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const quizReady = usable.status === "quiz_ready";
  const attempted = docConcepts.some((c) => masteryByConceptId.has(c.id));

  if (docConcepts.length === 0 || !quizReady || !attempted) {
    const step: MaterialStep = quizReady ? "quiz" : "study-guide";
    return {
      action: quizReady ? ACTION.quiz(usable.filename) : `Start the study guide for ${usable.filename}`,
      detail: quizReady
        ? "A short quiz shows which topics you already know and which need work."
        : "The study guide sets up the topics in your notes, one at a time.",
      href: `/dashboard/${usable.id}?step=${step}`,
    };
  }

  const next =
    docConcepts.find((c) => (masteryByConceptId.get(c.id) ?? 0) < 80) ?? docConcepts[0];
  const mastery = masteryByConceptId.get(next.id) ?? null;
  const step = recommendedStep({ quizReady, mastery });
  const allMastered = docConcepts.every((c) => (masteryByConceptId.get(c.id) ?? 0) >= 80);
  return {
    action: allMastered ? ACTION.flashcards(usable.filename) : ACTION[step](next.name),
    detail: allMastered
      ? "You've mastered every topic here. A quick review keeps it fresh."
      : `From ${usable.filename}${mastery !== null ? ` · ${mastery}% mastery` : ""}`,
    href: `/dashboard/${usable.id}?step=${allMastered ? "flashcards" : step}&concept=${encodeURIComponent(next.id)}`,
  };
}
