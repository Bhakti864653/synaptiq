import Link from "next/link";
import { masteryColorVar } from "@/lib/mastery";
import type { ConstellationData } from "@/lib/visualization/buildConstellationData";

// The accessible, always-available alternative to the WebGL/SVG scene -
// grouped by real source material, each concept a real link to that
// material's page. Not gated behind "WebGL failed"; anyone can reach for
// this instead of the visual scene.
export default function ConstellationListView({ data }: { data: ConstellationData }) {
  const byDocument = new Map<string, { label: string; nodes: ConstellationData["nodes"] }>();
  for (const node of data.nodes) {
    const entry = byDocument.get(node.documentId) ?? { label: node.documentLabel, nodes: [] };
    entry.nodes.push(node);
    byDocument.set(node.documentId, entry);
  }

  if (data.nodes.length === 0) {
    return (
      <p className="p-4 text-sm text-ink-muted">
        No concepts yet - upload a material to start building your constellation.
      </p>
    );
  }

  return (
    <ul className="flex max-h-full flex-col gap-4 overflow-y-auto p-4">
      {Array.from(byDocument.entries()).map(([documentId, group]) => (
        <li key={documentId} className="flex flex-col gap-1.5">
          <Link
            href={`/dashboard/${documentId}`}
            className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted hover:text-ink"
          >
            {group.label}
          </Link>
          <ul className="flex flex-col gap-1">
            {group.nodes.map((node) => (
              <li key={node.id}>
                <Link
                  href={`/dashboard/${node.documentId}`}
                  className="flex items-center justify-between gap-3 rounded-md px-1.5 py-1 hover:bg-line/40"
                >
                  <span className="text-sm text-ink">{node.label}</span>
                  <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <span
                      aria-hidden
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor:
                          node.mastery === null ? "var(--line)" : masteryColorVar(node.mastery),
                      }}
                    />
                    {node.mastery === null ? "Not started" : `${node.mastery}%`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
