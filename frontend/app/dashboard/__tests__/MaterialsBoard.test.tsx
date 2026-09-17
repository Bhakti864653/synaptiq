import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MaterialsBoard from "../MaterialsBoard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/authFetch", () => ({
  authFetch: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
    from: () => ({
      select: () => ({
        in: async () => ({ data: [], error: null }),
      }),
    }),
  }),
}));

function doc(overrides: Partial<Parameters<typeof MaterialsBoard>[0]["documents"][number]>) {
  return {
    id: "d1",
    filename: "notes.pdf",
    status: "processed",
    error_message: null,
    processing_started_at: null,
    ...overrides,
  };
}

const emptyMap = new Map<string, string[]>();
const emptyMastery = new Map<string, number>();

describe("MaterialsBoard syncing with refreshed server data", () => {
  it("shows a newly uploaded document once the documents prop includes it", () => {
    const { rerender } = render(
      <MaterialsBoard
        documents={[doc({ id: "d1", filename: "first.pdf" })]}
        conceptsByDocument={emptyMap}
        masteryByConceptId={emptyMastery}
      />,
    );
    expect(screen.getByText("first.pdf")).toBeInTheDocument();
    expect(screen.queryByText("second.pdf")).not.toBeInTheDocument();

    rerender(
      <MaterialsBoard
        documents={[
          doc({ id: "d2", filename: "second.pdf" }),
          doc({ id: "d1", filename: "first.pdf" }),
        ]}
        conceptsByDocument={emptyMap}
        masteryByConceptId={emptyMastery}
      />,
    );

    expect(screen.getByText("first.pdf")).toBeInTheDocument();
    expect(screen.getByText("second.pdf")).toBeInTheDocument();
    // Exactly one of each - not duplicated by the resync.
    expect(screen.getAllByText("first.pdf")).toHaveLength(1);
  });

  it("removes a document once it's no longer in the documents prop", () => {
    const { rerender } = render(
      <MaterialsBoard
        documents={[doc({ id: "d1", filename: "first.pdf" }), doc({ id: "d2", filename: "second.pdf" })]}
        conceptsByDocument={emptyMap}
        masteryByConceptId={emptyMastery}
      />,
    );
    expect(screen.getByText("second.pdf")).toBeInTheDocument();

    rerender(
      <MaterialsBoard
        documents={[doc({ id: "d1", filename: "first.pdf" })]}
        conceptsByDocument={emptyMap}
        masteryByConceptId={emptyMastery}
      />,
    );

    expect(screen.getByText("first.pdf")).toBeInTheDocument();
    expect(screen.queryByText("second.pdf")).not.toBeInTheDocument();
  });

  it("reflects an updated status and error message for an existing document", () => {
    const { rerender } = render(
      <MaterialsBoard
        documents={[doc({ id: "d1", filename: "first.pdf", status: "processing" })]}
        conceptsByDocument={emptyMap}
        masteryByConceptId={emptyMastery}
      />,
    );
    expect(screen.queryByText("Processing failed.")).not.toBeInTheDocument();

    rerender(
      <MaterialsBoard
        documents={[
          doc({
            id: "d1",
            filename: "first.pdf",
            status: "error",
            error_message: "extraction blew up",
          }),
        ]}
        conceptsByDocument={emptyMap}
        masteryByConceptId={emptyMastery}
      />,
    );

    expect(screen.getByText("extraction blew up")).toBeInTheDocument();
  });
});
