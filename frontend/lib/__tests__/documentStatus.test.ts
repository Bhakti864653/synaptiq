import { describe, expect, it } from "vitest";
import { isStalledProcessing, PROCESSING_STALE_MS } from "../documentStatus";

describe("isStalledProcessing", () => {
  const now = 1_000_000_000;

  it("is false for a non-processing status regardless of timestamp", () => {
    expect(isStalledProcessing("processed", null, now)).toBe(false);
    expect(isStalledProcessing("uploaded", "1970-01-01T00:00:00Z", now)).toBe(false);
  });

  it("is false for processing that started well within the stale window", () => {
    const recent = new Date(now - 1000).toISOString();
    expect(isStalledProcessing("processing", recent, now)).toBe(false);
  });

  it("is true once processing has run past the stale window", () => {
    const old = new Date(now - PROCESSING_STALE_MS - 1000).toISOString();
    expect(isStalledProcessing("processing", old, now)).toBe(true);
  });

  it("is true for processing with no recorded start time at all", () => {
    expect(isStalledProcessing("processing", null, now)).toBe(true);
    expect(isStalledProcessing("processing", undefined, now)).toBe(true);
  });
});
