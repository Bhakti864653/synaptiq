import { describe, expect, it } from "vitest";
import { isSupportedFile } from "../supportedFileTypes";

describe("isSupportedFile", () => {
  it("accepts every documented format", () => {
    for (const name of ["notes.pdf", "NOTES.PDF", "slides.pptx", "essay.docx", "raw.txt"]) {
      expect(isSupportedFile(name)).toBe(true);
    }
  });

  it("rejects legacy binary formats not actually supported by the backend", () => {
    expect(isSupportedFile("slides.ppt")).toBe(false);
    expect(isSupportedFile("essay.doc")).toBe(false);
  });

  it("rejects unrelated or missing extensions", () => {
    expect(isSupportedFile("archive.zip")).toBe(false);
    expect(isSupportedFile("no-extension")).toBe(false);
  });
});
