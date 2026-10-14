import { authFetch } from "@/lib/authFetch";

export type ConceptGuide = { summary: string; excerpt: string };

// A concept's explanation is written the first time anything asks for it
// (POST .../guide), then stored. The material page's concept card and the
// Study guide both ask, often at the same moment, so share one request per
// concept instead of paying for the same generation twice.
const requests = new Map<string, Promise<ConceptGuide>>();

export function fetchConceptGuide(documentId: string, conceptId: string): Promise<ConceptGuide> {
  const existing = requests.get(conceptId);
  if (existing) return existing;
  const request = (async () => {
    const res = await authFetch(`/documents/${documentId}/concepts/${conceptId}/guide`, {
      method: "POST",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || `Failed (${res.status})`);
    }
    return (await res.json()) as ConceptGuide;
  })();
  // A failure shouldn't stick: the next ask (e.g. "Try again") retries.
  request.catch(() => requests.delete(conceptId));
  requests.set(conceptId, request);
  return request;
}
