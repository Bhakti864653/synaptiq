import Link from "next/link";
import Button from "@/components/Button";
import MasteryRing from "@/components/MasteryRing";

export type ContinueLearningFocus = {
  documentId: string;
  filename: string;
  conceptName: string | null;
  conceptSummary: string | null;
  mastery: number | null;
};

// The single clearest action on the dashboard - real current material,
// real current concept (the first one not yet mastered, or the first
// concept if none have been attempted), real mastery. No card border here
// on purpose: this section earns its prominence from scale and spacing,
// not another bordered box competing with the rest of the page.
export default function ContinueLearning({ focus }: { focus: ContinueLearningFocus | null }) {
  if (!focus) return null;

  // A material that hasn't had its concepts extracted yet (still
  // "processed", not "quiz_ready") has no real concept name to show - fall
  // back to the filename as the headline, and don't repeat it a second
  // time as a subtitle right underneath itself.
  const hasConcept = focus.conceptName !== null;

  return (
    <section className="syn-next-content">
      <span className="syn-eyebrow">Next up / Your current focus</span>
      <div className="syn-next-title-row">
        <div className="min-w-0 flex-1">
          <h2 className="syn-next-title">
            {focus.conceptName ?? focus.filename}
          </h2>
          {hasConcept && <p className="syn-next-source">From {focus.filename}</p>}
          {focus.conceptSummary && (
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
              {focus.conceptSummary}
            </p>
          )}
        </div>
        <MasteryRing score={focus.mastery} size={88} />
      </div>
      <div className="syn-next-actions">
        <Link href={`/dashboard/${focus.documentId}`}>
          <Button variant="primary">
            {hasConcept ? "Continue practicing" : "Set up material"}
          </Button>
        </Link>
        {hasConcept && (
          <Link
            href={`/dashboard/${focus.documentId}`}
            className="text-sm font-medium text-ink-muted hover:text-ink"
          >
            Ask Synaptiq about this &rarr;
          </Link>
        )}
      </div>
    </section>
  );
}
