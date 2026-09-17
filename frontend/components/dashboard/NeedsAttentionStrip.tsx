import Link from "next/link";
import { masteryColorVar } from "@/lib/mastery";

export type NeedsAttentionItem = {
  conceptId: string;
  documentId: string;
  conceptName: string;
  filename: string;
  score: number;
};

// An open horizontal strip instead of a bordered card - thin dividers
// between up to three real weak concepts rather than another rounded box.
export default function NeedsAttentionStrip({
  items,
  totalCount,
}: {
  items: NeedsAttentionItem[];
  totalCount: number;
}) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
          Needs attention
        </h2>
        {totalCount > items.length && (
          <Link href="/dashboard/weak-spots" className="text-xs text-ink-muted hover:text-ink">
            See all {totalCount} &rarr;
          </Link>
        )}
      </div>
      <div className="flex flex-col divide-y divide-line sm:flex-row sm:divide-x sm:divide-y-0">
        {items.map((item) => (
          <Link
            key={item.conceptId}
            href={`/dashboard/${item.documentId}`}
            className="group flex flex-1 items-center gap-2.5 py-2.5 pl-0 pr-4 sm:px-4 sm:first:pl-0"
          >
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: masteryColorVar(item.score) }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink group-hover:underline">
                {item.conceptName}
              </span>
              <span className="block truncate text-xs text-ink-muted">{item.filename}</span>
            </span>
            <span className="shrink-0 font-mono text-xs text-ink-muted">{item.score}%</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
