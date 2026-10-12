import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { masteryColorVar } from "@/lib/mastery";

export default async function WeakSpotsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: documents } = await supabase
    .from("documents")
    .select("id, filename");

  const { data: concepts } = await supabase
    .from("concepts")
    .select("id, document_id, name");

  const { data: mastery } = await supabase
    .from("concept_mastery")
    .select("concept_id, mastery_score");

  const masteryByConceptId = new Map(
    (mastery ?? []).map((m) => [m.concept_id, m.mastery_score]),
  );
  const documentById = new Map((documents ?? []).map((d) => [d.id, d]));

  // Same definition as the Dashboard's weak-spots card: real, if partial,
  // evidence of struggling (score > 0) - a concept nobody has attempted yet
  // defaults to the same 0 score and isn't a weak spot so much as an
  // unstarted one.
  const weakSpots = (concepts ?? [])
    .map((c) => ({ ...c, score: masteryByConceptId.get(c.id) ?? 0 }))
    .filter((c) => c.score > 0 && c.score < 60)
    .sort((a, b) => a.score - b.score);

  return (
    <main className="syn-page mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 pb-20 pt-8 sm:px-10">
      <header className="syn-inner-header">
        <span className="syn-eyebrow">Your learning / Focus areas</span>
        <h1 className="syn-section-title">A clearer way <em>forward.</em></h1>
        <p className="syn-lead">
          Every concept under 60% mastery, across all your materials, weakest
          first.
        </p>
      </header>

      {weakSpots.length > 0 && (
        <Link href="/dashboard/practice" className="w-fit">
          <Button className="w-fit">Practice all weak spots</Button>
        </Link>
      )}

      {weakSpots.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-muted">
            No weak spots right now - either you&apos;re doing well, or there&apos;s
            nothing with a real attempt behind it yet.
          </p>
        </Card>
      ) : (
        <Card className="flex flex-col gap-1 p-2">
          {weakSpots.map((c) => {
            const doc = documentById.get(c.document_id);
            if (!doc) return null;
            return (
              <Link
                key={c.id}
                href={`/dashboard/${doc.id}?concept=${encodeURIComponent(c.id)}`}
                className="flex items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-line/40"
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
            );
          })}
        </Card>
      )}
    </main>
  );
}
