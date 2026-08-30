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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="gradient-hero rounded-2xl p-6">
        <h1 className="text-2xl font-semibold text-ink">Weak Spots</h1>
        <p className="text-sm text-ink-muted">
          Every concept under 60% mastery, across all your materials, weakest
          first.
        </p>
      </div>

      {weakSpots.length > 0 && (
        <Link href="/dashboard/practice" className="w-fit">
          <Button className="w-fit">Practice all weak spots</Button>
        </Link>
      )}

      {weakSpots.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-muted">
            No weak spots right now - either you're doing well, or there's
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
                href={`/dashboard/${doc.id}`}
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
