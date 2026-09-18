import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TopicVisualization from "..";

// This test only needs to verify routing (which mode gets picked, and
// that it only fires when real evidence is attached) - the modes' own
// rendering is covered separately (KnowledgeConstellation has its own
// test suite; selectVisualization has its own dedicated test suite for
// the underlying evidence rules).
vi.mock("../../modes/GeographyGlobe", () => ({
  default: () => <div data-testid="mode">geography</div>,
}));
vi.mock("../../modes/ChemistryMolecule", () => ({
  default: () => <div data-testid="mode">chemistry-molecule</div>,
}));
vi.mock("../../modes/MathSurface", () => ({
  default: () => <div data-testid="mode">math-graph</div>,
}));
vi.mock("../../modes/HistoryTimeline", () => ({
  default: () => <div data-testid="mode">history-timeline</div>,
}));
vi.mock("../../KnowledgeConstellation", () => ({
  default: ({ title }: { title: string }) => <div data-testid="mode">{title}</div>,
}));

describe("TopicVisualization router", () => {
  it("routes a geography material to the globe even without a specific named location", () => {
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

  it("routes to the chemistry molecule mode only when a real molecule is recognized", () => {
    render(
      <TopicVisualization
        documentId="doc-1"
        filename="Chemistry Basics.pdf"
        concepts={[{ id: "c1", name: "Water" }]}
        masteryByConceptId={new Map()}
      />,
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("chemistry-molecule");
  });

  it("does NOT route to the chemistry molecule mode without a recognized molecule - falls back honestly", () => {
    render(
      <TopicVisualization
        documentId="doc-1"
        filename="Chemistry Basics.pdf"
        concepts={[{ id: "c1", name: "Chemical Bonds" }, { id: "c2", name: "Reaction Rates" }]}
        masteryByConceptId={new Map()}
      />,
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("Chemistry concepts");
  });

  it("routes to the math graph mode only when a real, safely-parsed equation is found", () => {
    render(
      <TopicVisualization
        documentId="doc-1"
        filename="Calculus Notes.pdf"
        concepts={[{ id: "c1", name: "Derivatives", summary: "y = x^2 is a simple example." }]}
        masteryByConceptId={new Map()}
      />,
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("math-graph");
  });

  it("does NOT route to the math graph mode without a real equation - falls back honestly", () => {
    render(
      <TopicVisualization
        documentId="doc-1"
        filename="Calculus Notes.pdf"
        concepts={[{ id: "c1", name: "Derivatives" }]}
        masteryByConceptId={new Map()}
      />,
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("Math concepts");
  });

  it("routes real dated history content to the timeline mode", () => {
    render(
      <TopicVisualization
        documentId="doc-1"
        filename="20th Century History.pdf"
        concepts={[
          { id: "c1", name: "WWI", summary: "Began in 1914." },
          { id: "c2", name: "WWII", summary: "Began in 1939." },
        ]}
        masteryByConceptId={new Map()}
      />,
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("history-timeline");
  });

  it("routes literature content with real concepts to the character/theme network", () => {
    render(
      <TopicVisualization
        documentId="doc-1"
        filename="Novel Study.pdf"
        concepts={[
          { id: "c1", name: "Protagonist's Journey" },
          { id: "c2", name: "Theme of Isolation" },
        ]}
        masteryByConceptId={new Map()}
      />,
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("Character & theme network");
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
    expect(screen.getByTestId("mode")).toHaveTextContent("Topic visualization");
  });
});
