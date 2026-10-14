import { describe, expect, it } from "vitest";
import { nextStepFor } from "../nextStep";

const doc = { id: "d1", filename: "Biology.pdf", status: "quiz_ready" };
const concepts = [
  { id: "c1", document_id: "d1", name: "Cells", order_index: 0 },
  { id: "c2", document_id: "d1", name: "Mitosis", order_index: 1 },
];

describe("nextStepFor", () => {
  it("has nothing to suggest without materials (Home shows the upload instead)", () => {
    expect(nextStepFor({ documents: [], concepts: [], masteryByConceptId: new Map() })).toBeNull();
  });

  it("asks you to take the quiz before any answers exist", () => {
    const s = nextStepFor({ documents: [doc], concepts, masteryByConceptId: new Map() })!;
    expect(s.action).toBe("Take the quiz on Biology.pdf");
    expect(s.href).toBe("/dashboard/d1?step=quiz");
  });

  it("starts with the study guide while the quiz isn't set up yet", () => {
    const s = nextStepFor({
      documents: [{ ...doc, status: "processed" }],
      concepts,
      masteryByConceptId: new Map(),
    })!;
    expect(s.href).toBe("/dashboard/d1?step=study-guide");
  });

  it("continues studying the first topic that isn't mastered", () => {
    const s = nextStepFor({
      documents: [doc],
      concepts,
      masteryByConceptId: new Map([["c1", 90], ["c2", 30]]),
    })!;
    expect(s.action).toBe("Continue studying Mitosis");
    expect(s.href).toBe("/dashboard/d1?step=study-guide&concept=c2");
  });

  it("suggests practice for a middling score", () => {
    const s = nextStepFor({
      documents: [doc],
      concepts,
      masteryByConceptId: new Map([["c1", 65]]),
    })!;
    expect(s.action).toBe("Practice Cells");
  });

  it("suggests reviewing flashcards once everything is mastered", () => {
    const s = nextStepFor({
      documents: [doc],
      concepts,
      masteryByConceptId: new Map([["c1", 90], ["c2", 85]]),
    })!;
    expect(s.action).toBe("Review flashcards for Biology.pdf");
  });

  it("points at a material still being prepared", () => {
    const s = nextStepFor({
      documents: [{ ...doc, status: "processing" }],
      concepts: [],
      masteryByConceptId: new Map(),
    })!;
    expect(s.action).toBe("Check on Biology.pdf");
  });
});
