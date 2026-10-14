import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Flashcards from "../Flashcards";
import { authFetch } from "@/lib/authFetch";
import { ConceptFocusProvider } from "@/lib/conceptFocus";

vi.mock("@/lib/authFetch", () => ({
  authFetch: vi.fn(),
}));

const mockedAuthFetch = vi.mocked(authFetch);

const dueCards = [
  { id: "f1", concept_id: "c1", front: "What is a weight?", back: "A learned parameter" },
  { id: "f2", concept_id: "c2", front: "What does ReLU return for -3?", back: "0" },
  { id: "f3", concept_id: "c2", front: "Why non-linearity?", back: "To learn curves" },
];

function respond(body: unknown) {
  return { ok: true, json: async () => body } as Response;
}

describe("Flashcards focused on the picked concept", () => {
  beforeEach(() => {
    mockedAuthFetch.mockReset();
    mockedAuthFetch.mockImplementation(async (path) =>
      String(path).endsWith("/due") ? respond({ cards: dueCards }) : respond({}),
    );
  });

  it("reviews the picked concept's cards first, then can review every due card", async () => {
    const user = userEvent.setup();
    render(
      <ConceptFocusProvider value={{ id: "c2", name: "Activation" }}>
        <Flashcards documentId="doc1" />
      </ConceptFocusProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Review due cards" }));
    expect(await screen.findByText("Activation: 2 cards due")).toBeInTheDocument();
    expect(screen.getByText("What does ReLU return for -3?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Review all 3 due cards" }));
    expect(screen.getByText("3 cards due")).toBeInTheDocument();
    expect(screen.getByText("What is a weight?")).toBeInTheDocument();
  });

  it("drops a reviewed card so it never comes round twice", async () => {
    const user = userEvent.setup();
    render(
      <ConceptFocusProvider value={{ id: "c2", name: "Activation" }}>
        <Flashcards documentId="doc1" />
      </ConceptFocusProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Review due cards" }));
    await screen.findByText("Activation: 2 cards due");
    await user.click(screen.getByRole("button", { name: "Show answer" }));
    await user.click(screen.getByRole("button", { name: "Good" }));

    expect(await screen.findByText("Activation: 1 card due")).toBeInTheDocument();
    expect(screen.getByText("Why non-linearity?")).toBeInTheDocument();
    expect(mockedAuthFetch).toHaveBeenCalledWith("/flashcards/f2/review", expect.anything());
  });
});
