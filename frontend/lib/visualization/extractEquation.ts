import { parseSafeExpression, type ParsedEquation } from "./safeMathParser";

export type ExtractedEquation = {
  displayText: string; // exactly what will be rendered beside the graph
  parsed: ParsedEquation;
};

// Looks for "y = <expr>", "f(x) = <expr>", or "z = <expr>" patterns in
// real material text and attempts to parse the right-hand side with the
// safe parser. Returns the FIRST one that both matches the pattern and
// parses successfully - never invents an equation that isn't literally
// present in the text.
const EQUATION_PATTERN = /\b([yz]|f\s*\(\s*x\s*(?:,\s*y\s*)?\))\s*=\s*([^,.;\n]+)/gi;

// The regex captures everything up to the next clause boundary, which is
// often more than just the expression itself in a real sentence (e.g.
// "y = x^2 - 3*x + 2 is a parabola"). Rather than trying to out-guess
// English grammar with a character class, this backs off one trailing
// word at a time until the safe parser actually accepts what's left -
// the real expression is always a prefix of the captured text in normal
// writing, so this converges on exactly the right substring.
function parseWithBackoff(rhsRaw: string): { display: string; parsed: NonNullable<ReturnType<typeof parseSafeExpression>> } | null {
  const words = rhsRaw.trim().split(/\s+/);
  for (let end = words.length; end > 0; end--) {
    const candidate = words.slice(0, end).join(" ").trim().replace(/[.]+$/, "");
    if (!candidate) continue;
    const parsed = parseSafeExpression(candidate);
    if (parsed) return { display: candidate, parsed };
  }
  return null;
}

export function extractEquation(text: string): ExtractedEquation | null {
  const matches = Array.from(text.matchAll(EQUATION_PATTERN));
  for (const match of matches) {
    const lhs = match[1].toLowerCase().replace(/\s+/g, "");
    const result = parseWithBackoff(match[2]);
    if (!result) continue;
    const displayLhs = lhs.startsWith("f(x,y)") ? "z" : lhs.startsWith("f(x)") ? "y" : lhs;
    return { displayText: `${displayLhs} = ${result.display}`, parsed: result.parsed };
  }
  return null;
}
