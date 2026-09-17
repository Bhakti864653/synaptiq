import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PracticeSession from "../PracticeSession";
import { authFetch } from "@/lib/authFetch";

vi.mock("@/lib/authFetch", () => ({
  authFetch: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        in: async () => ({ data: [], error: null }),
      }),
    }),
  }),
}));

const mockedAuthFetch = vi.mocked(authFetch);

describe("PracticeSession readiness gating", () => {
  beforeEach(() => {
    mockedAuthFetch.mockReset();
  });

  it("shows an upload prompt and no Start Practice button when there are no documents", () => {
    render(<PracticeSession initialDocuments={[]} />);

    expect(
      screen.getByText("Upload your first study material to begin practicing."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to upload" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Start practice" }),
    ).not.toBeInTheDocument();
  });

  it("shows a processing message and no Start Practice button while material is preparing", () => {
    render(
      <PracticeSession
        initialDocuments={[{ id: "d1", status: "processing", error_message: null }]}
      />,
    );

    expect(
      screen.getByText(
        "Your material is still being prepared. Practice will unlock when it's ready.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Start practice" }),
    ).not.toBeInTheDocument();
  });

  it("shows a retry action when processing failed and nothing is ready", () => {
    render(
      <PracticeSession
        initialDocuments={[{ id: "d1", status: "error", error_message: "boom" }]}
      />,
    );

    expect(
      screen.getByText("Processing failed for your material."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry processing" })).toBeInTheDocument();
  });

  it("links to the diagnostic quiz when a document is processed but has no concepts yet", () => {
    render(
      <PracticeSession
        initialDocuments={[{ id: "d1", status: "processed", error_message: null }]}
      />,
    );

    expect(
      screen.getByText(
        "Complete the diagnostic quiz first so Synaptiq can personalize your practice.",
      ),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Go to diagnostic quiz" });
    expect(link).toHaveAttribute("href", "/dashboard/d1");
  });

  it("enables Start Practice as soon as one document is quiz_ready, even alongside a failed one", () => {
    render(
      <PracticeSession
        initialDocuments={[
          { id: "d1", status: "error", error_message: "boom" },
          { id: "d2", status: "quiz_ready", error_message: null },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "Start practice" })).toBeEnabled();
    expect(screen.queryByText("Processing failed for your material.")).not.toBeInTheDocument();
  });

  it("calls POST /practice when Start Practice is clicked while ready", async () => {
    const user = userEvent.setup();
    mockedAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ questions: [] }),
    } as Response);

    render(
      <PracticeSession
        initialDocuments={[{ id: "d1", status: "quiz_ready", error_message: null }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start practice" }));

    await waitFor(() =>
      expect(mockedAuthFetch).toHaveBeenCalledWith("/practice", { method: "POST" }),
    );
  });

  it("shows the backend's structured error message if a click somehow still fails", async () => {
    const user = userEvent.setup();
    mockedAuthFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        detail: {
          code: "DIAGNOSTIC_REQUIRED",
          message: "Complete the diagnostic quiz first so Synaptiq can personalize your practice.",
          document_id: "d1",
        },
      }),
    } as Response);

    render(
      <PracticeSession
        initialDocuments={[{ id: "d1", status: "quiz_ready", error_message: null }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start practice" }));

    expect(
      await screen.findByText(
        "Complete the diagnostic quiz first so Synaptiq can personalize your practice.",
      ),
    ).toBeInTheDocument();
  });
});
