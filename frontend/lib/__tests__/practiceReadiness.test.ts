import { describe, expect, it } from "vitest";
import { classifyPracticeReadiness } from "../practiceReadiness";

describe("classifyPracticeReadiness", () => {
  it("reports NO_DOCUMENTS for an empty list", () => {
    expect(classifyPracticeReadiness([])).toEqual({
      code: "NO_DOCUMENTS",
      documentId: null,
    });
  });

  it("reports PROCESSING when a document is still uploaded", () => {
    expect(
      classifyPracticeReadiness([{ id: "d1", status: "uploaded" }]),
    ).toEqual({ code: "PROCESSING", documentId: "d1" });
  });

  it("reports PROCESSING when a document is still processing", () => {
    expect(
      classifyPracticeReadiness([{ id: "d1", status: "processing" }]),
    ).toEqual({ code: "PROCESSING", documentId: "d1" });
  });

  it("reports PROCESSING_FAILED once nothing is in flight", () => {
    expect(classifyPracticeReadiness([{ id: "d1", status: "error" }])).toEqual({
      code: "PROCESSING_FAILED",
      documentId: "d1",
    });
  });

  it("reports SETUP_REQUIRED for a processed document with no concepts yet", () => {
    expect(
      classifyPracticeReadiness([{ id: "d1", status: "processed" }]),
    ).toEqual({ code: "SETUP_REQUIRED", documentId: "d1" });
  });

  it("reports READY when at least one document is quiz_ready, regardless of others", () => {
    const documents = [
      { id: "d1", status: "error" },
      { id: "d2", status: "quiz_ready" },
      { id: "d3", status: "processing" },
    ];
    expect(classifyPracticeReadiness(documents)).toEqual({
      code: "READY",
      documentId: null,
    });
  });

  it("prioritizes PROCESSING over a mixture of failed and processed documents", () => {
    const documents = [
      { id: "d1", status: "error" },
      { id: "d2", status: "processing" },
      { id: "d3", status: "processed" },
    ];
    expect(classifyPracticeReadiness(documents)).toEqual({
      code: "PROCESSING",
      documentId: "d2",
    });
  });

  it("prioritizes PROCESSING_FAILED over SETUP_REQUIRED once nothing is processing", () => {
    const documents = [
      { id: "d1", status: "processed" },
      { id: "d2", status: "error" },
    ];
    expect(classifyPracticeReadiness(documents)).toEqual({
      code: "PROCESSING_FAILED",
      documentId: "d2",
    });
  });
});
