import Link from "next/link";
import Card from "@/components/Card";
import { masteryColorVar } from "@/lib/mastery";

export type WeakTopic = {
  id: string;
  name: string;
  score: number;
  documentId: string;
  filename: string;
};

// Every concept under 60% mastery across all materials, weakest first - the
// list that used to be its own "Focus areas" page. Same definition as Home's
// "Needs attention": a real, if partial, attempt (score > 0), since an
// unstarted concept isn't weak so much as not yet tried.
export default function WeakestTopics({ topics }: { topics: WeakTopic[] }) {
  return (
    <section id="weakest" aria-labelledby="weakest-title" className="flex scroll-mt-24 flex-col gap-3">
      <h2 id="weakest-title" className="text-lg font-semibold text-ink">
        Your weakest topics
      </h2>
      {topics.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-muted">
            No weak topics right now - either you&apos;re doing well, or you haven&apos;t
            answered quiz questions yet.
          </p>
        </Card>
      ) : (
        <Card className="flex flex-col gap-1 p-2">
          {topics.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/${c.documentId}?concept=${encodeURIComponent(c.id)}`}
              className="flex items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-line/40"
            >
              <span className="text-sm text-ink">
                {c.name}
                <span className="text-ink-muted"> · {c.filename}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-xs text-ink-muted">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: masteryColorVar(c.score) }}
                />
                {c.score}%
              </span>
            </Link>
          ))}
        </Card>
      )}
    </section>
  );
}
