import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import KnowledgeConstellation from "..";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// jsdom has no real WebGL implementation, so supportsWebGL() correctly
// returns false in this environment - every test here exercises the
// CSS/SVG fallback path, which is exactly the accessible, always-testable
// surface (the real WebGL Scene is dynamically imported and skipped here
// on purpose, matching how it behaves for a real user without WebGL).
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

// jsdom doesn't implement matchMedia at all - useReducedMotion() needs a
// stub that behaves like "no reduced-motion preference" for these tests.
window.matchMedia =
  window.matchMedia ||
  ((query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList);

const sampleData = {
  nodes: [
    {
      id: "c1",
      label: "Mitochondria",
      documentId: "doc-1",
      documentLabel: "Cell Biology.pdf",
      mastery: 90,
      position: [1, 0, 0] as [number, number, number],
      color: "#f2a63f",
    },
    {
      id: "c2",
      label: "Photosynthesis",
      documentId: "doc-1",
      documentLabel: "Cell Biology.pdf",
      mastery: null,
      position: [-1, 0.5, 0.2] as [number, number, number],
      color: "#8b6bff",
    },
  ],
  edges: [{ source: "c1", target: "c2" }],
};

describe("KnowledgeConstellation", () => {
  it("shows the empty hint when there is no real data yet, not a placeholder graph", () => {
    render(<KnowledgeConstellation data={{ nodes: [], edges: [] }} emptyHint="Upload something" />);
    expect(screen.getByText("Upload something")).toBeInTheDocument();
  });

  it("renders the fallback scene with every real concept as an accessible control", () => {
    render(<KnowledgeConstellation data={sampleData} />);
    expect(screen.getByRole("button", { name: /Mitochondria/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Photosynthesis/i })).toBeInTheDocument();
  });

  it("navigates to the concept's real document when a node is activated", async () => {
    const user = userEvent.setup();
    render(<KnowledgeConstellation data={sampleData} />);
    await user.click(screen.getByRole("button", { name: /Mitochondria/i }));
    expect(pushMock).toHaveBeenCalledWith("/dashboard/doc-1");
  });

  it("toggles to the accessible list view and shows real mastery values", async () => {
    const user = userEvent.setup();
    render(<KnowledgeConstellation data={sampleData} />);
    await user.click(screen.getByRole("button", { name: "View as list" }));
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("Not started")).toBeInTheDocument();
  });
});
