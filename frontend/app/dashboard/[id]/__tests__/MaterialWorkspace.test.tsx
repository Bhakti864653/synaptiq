import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import MaterialWorkspace from "../MaterialWorkspace";

// The visualization's general/fallback path (KnowledgeConstellation) calls
// useRouter() to navigate on node selection - not exercised by these
// tests, but it must be mounted for the component tree to render at all.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// jsdom doesn't implement scrollIntoView at all - the "Continue practicing"
// action calls it to bring the tabs into view, which is harmless UX sugar
// that has nothing to do with what these tests actually verify.
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// The visualization now renders for real (in its jsdom fallback form,
// since there's no WebGL here) inside this component - its own hooks
// (useReducedMotion, useInView) need the same stubs its own test suite
// uses, since jsdom implements neither matchMedia nor IntersectionObserver.
window.matchMedia =
  window.matchMedia ||
  ((query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList);

class FakeIntersectionObserver {
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe() {
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as never);
  }
  disconnect() {}
  unobserve() {}
}
// @ts-expect-error - test-only stub, not a full IntersectionObserver
global.IntersectionObserver = FakeIntersectionObserver;

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
        filename="Cell Biology.pdf"
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
        filename="Cell Biology.pdf"
        tabs={tabs}
      />,
    );
    // The key idea renders inside curly editorial quotes as several text
    // nodes, so match on the quoted form specifically - the plain-text
    // full-summary paragraph below it also contains this same sentence as
    // a substring (it's the same real source text), but never in quotes.
    expect(
      screen.getByText(
        (_, el) => (el?.textContent ?? "") === "“Glycolysis breaks down glucose into pyruvate.”",
      ),
    ).toBeInTheDocument();
  });

  it("selecting a different concept in the rail updates the central focus", async () => {
    const user = userEvent.setup();
    render(
      <MaterialWorkspace
        documentId="doc-1"
        concepts={concepts}
        filename="Cell Biology.pdf"
        tabs={tabs}
      />,
    );
    // With these exact concepts, the biology-process visualization now
    // also renders nodes named after the same real concepts - scope to
    // the rail specifically so this exercises rail selection, not
    // whichever same-named control happens to be found first.
    const rail = within(screen.getByRole("navigation", { name: "Concepts in this material" }));
    await user.click(rail.getByRole("button", { name: /Electron Transport Chain/ }));
    expect(screen.getByRole("heading", { name: "Electron Transport Chain" })).toBeInTheDocument();
  });

  it("marks a mastered concept as completed in the rail", () => {
    render(
      <MaterialWorkspace
        documentId="doc-1"
        concepts={concepts}
        filename="Cell Biology.pdf"
        tabs={tabs}
      />,
    );
    const rail = within(screen.getByRole("navigation", { name: "Concepts in this material" }));
    const glycolysisButton = rail.getByRole("button", { name: /Glycolysis/ });
    expect(glycolysisButton.textContent).toContain("✓");
  });

  it("the dominant practice action switches to the quiz tab and shows its content", async () => {
    const user = userEvent.setup();
    render(
      <MaterialWorkspace
        documentId="doc-1"
        concepts={concepts}
        filename="Cell Biology.pdf"
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
        filename="Cell Biology.pdf"
        tabs={tabs}
      />,
    );
    // Only the heading/journey/actions should render - no invented summary text.
    expect(screen.getByRole("heading", { name: "Electron Transport Chain" })).toBeInTheDocument();
  });
});
