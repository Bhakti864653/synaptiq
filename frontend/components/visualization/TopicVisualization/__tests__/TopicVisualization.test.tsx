import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TopicVisualization from "..";

// This test only needs to verify routing (which mode gets picked for
// which subject) - the modes' own rendering is covered separately
// (KnowledgeConstellation has its own test suite; the others are thin
// wrappers around VisualizationFrame + a Scene component).
vi.mock("../../modes/GeographyGlobe", () => ({
  default: () => <div data-testid="mode">geography</div>,
}));
vi.mock("../../modes/ChemistryMolecule", () => ({
  default: () => <div data-testid="mode">chemistry</div>,
}));
vi.mock("../../modes/MathSurface", () => ({
  default: () => <div data-testid="mode">mathematics</div>,
}));
vi.mock("../../KnowledgeConstellation", () => ({
  default: () => <div data-testid="mode">constellation</div>,
}));

describe("TopicVisualization router", () => {
  it("routes a geography material to the globe, not the constellation fallback", () => {
    render(
      <TopicVisualization
        documentId="doc-1"
        filename="World Geography.pdf"
        concepts={[{ id: "c1", name: "Mountain Ranges" }, { id: "c2", name: "Ocean Currents" }]}
        masteryByConceptId={new Map()}
      />,
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("geography");
  });

  it("routes a chemistry material to the molecule mode", () => {
    render(
      <TopicVisualization
        documentId="doc-1"
        filename="Chemistry Basics.pdf"
        concepts={[{ id: "c1", name: "Chemical Bonds" }]}
        masteryByConceptId={new Map()}
      />,
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("chemistry");
  });

  it("routes a mathematics material to the surface mode", () => {
    render(
      <TopicVisualization
        documentId="doc-1"
        filename="Calculus Notes.pdf"
        concepts={[{ id: "c1", name: "Derivatives" }]}
        masteryByConceptId={new Map()}
      />,
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("mathematics");
  });

  it("falls back to the knowledge constellation for an unrecognized subject", () => {
    render(
      <TopicVisualization
        documentId="doc-1"
        filename="Random Notes.txt"
        concepts={[{ id: "c1", name: "Thing One" }]}
        masteryByConceptId={new Map()}
      />,
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("constellation");
  });
});
