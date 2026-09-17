// Mirrors backend/app/documents.py's SUPPORTED_EXTENSIONS exactly - kept in
// sync manually since the two can't literally share code across the
// frontend/backend boundary. python-docx/python-pptx only parse the OOXML
// formats (.docx/.pptx), not the legacy binary .doc/.ppt formats, so those
// aren't supported anywhere in the pipeline.
export const SUPPORTED_EXTENSIONS = [".pdf", ".pptx", ".docx", ".txt"];
export const SUPPORTED_FORMATS_LABEL = "PDF, PPTX, DOCX, or TXT";

export function isSupportedFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
