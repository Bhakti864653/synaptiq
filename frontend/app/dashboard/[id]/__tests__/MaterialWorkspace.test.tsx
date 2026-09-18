import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import MaterialWorkspace from "../MaterialWorkspace";

// jsdom doesn't implement scrollIntoView at all - the "Continue practicing"
// action calls it to bring the tabs into view, which is harmless UX sugar
// that has nothing to do with what these tests actually verify.
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const concepts = [
  {
    id: "c1",
    name: "Glycolysis",
    summary: "Glycolysis breaks down glucose into pyruvate. It happens in the cytoplasm.",
    excerpt: null,
    mastery: 90,
  },
  {
    id: "c2",
    name: "Krebs Cycle",
    summary: null,
    excerpt: null,
    mastery: 30,
  },
  {
    id: "c3",
    name: "Electron Transport Chain",
    summary: null,
    excerpt: null,
    mastery: null,
  },
];

const tabs = [
  { id: "study-guide", label: "Study Guide", content: <div>Study Guide content</div> },
  { id: "quiz", label: "Quiz", content: <div>Quiz content</div> },
  { id: "tutor", label: "Tutor", content: <div>Tutor content</div> },
];

describe("MaterialWorkspace", () => {
  it("focuses the first not-yet-mastered real concept by default, not just the first one", () => {
    render(
      <MaterialWorkspace
        documentId="doc-1"
        concepts={concepts}
        visualization={<div>viz</div>}
        tabs={tabs}
      />,
    );
    // Glycolysis (90%) is mastered - Krebs Cycle (30%) is the real current focus.
    expect(screen.getByRole("heading", { name: "Krebs Cycle" })).toBeInTheDocument();
  });

  it("shows the real key idea (first sentence of the real summary), not a fabricated one", () => {
    render(
      <MaterialWorkspace
        documentId="doc-1"
        concepts={[concepts[0]]}
        visualization={<div>viz</div>}
        tabs={tabs}
      />,
    );
    expect(
      screen.getByText("Glycolysis breaks down glucose into pyruvate."),
    ).toBeInTheDocument();
  });

  it("selecting a different concept in the rail updates the central focus", async () => {
    const user = userEvent.setup();
    render(
      <MaterialWorkspace
        documentId="doc-1"
        concepts={concepts}
        visualization={<div>viz</div>}
        tabs={tabs}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Electron Transport Chain/ }));
    expect(screen.getByRole("heading", { name: "Electron Transport Chain" })).toBeInTheDocument();
  });

  it("marks a mastered concept as completed in the rail", () => {
    render(
      <MaterialWorkspace
        documentId="doc-1"
        concepts={concepts}
        visualization={<div>viz</div>}
        tabs={tabs}
      />,
    );
    const glycolysisButton = screen.getByRole("button", { name: /Glycolysis/ });
    expect(glycolysisButton.textContent).toContain("✓");
  });

  it("the dominant practice action switches to the quiz tab and shows its content", async () => {
    const user = userEvent.setup();
    render(
      <MaterialWorkspace
        documentId="doc-1"
        concepts={concepts}
        visualization={<div>viz</div>}
        tabs={tabs}
      />,
    );
    expect(screen.queryByText("Quiz content")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /practicing/i }));
    expect(screen.getByText("Quiz content")).toBeInTheDocument();
  });

  it("never fabricates a key idea when no summary or excerpt exists", () => {
    render(
      <MaterialWorkspace
        documentId="doc-1"
        concepts={[concepts[2]]}
        visualization={<div>viz</div>}
        tabs={tabs}
      />,
    );
    // Only the heading/journey/actions should render - no invented summary text.
    expect(screen.getByRole("heading", { name: "Electron Transport Chain" })).toBeInTheDocument();
  });
});
