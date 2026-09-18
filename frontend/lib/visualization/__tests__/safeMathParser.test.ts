import { describe, expect, it } from "vitest";
import { evaluateSafeExpression, parseSafeExpression } from "../safeMathParser";

describe("parseSafeExpression", () => {
  it("parses and correctly evaluates a real quadratic", () => {
    const parsed = parseSafeExpression("x^2 - 3*x + 2");
    expect(parsed).not.toBeNull();
    expect(evaluateSafeExpression(parsed!.node, 0, 0)).toBe(2);
    expect(evaluateSafeExpression(parsed!.node, 2, 0)).toBe(0);
    expect(evaluateSafeExpression(parsed!.node, 1, 0)).toBe(0);
  });

  it("parses trig functions and evaluates them against real Math results", () => {
    const parsed = parseSafeExpression("sin(x) * cos(y)");
    expect(parsed).not.toBeNull();
    expect(parsed!.usesY).toBe(true);
    const got = evaluateSafeExpression(parsed!.node, 1, 2);
    expect(got).toBeCloseTo(Math.sin(1) * Math.cos(2));
  });

  it("detects whether an expression uses y at all (for 2D-curve vs 3D-surface selection)", () => {
    expect(parseSafeExpression("2*x + 1")!.usesY).toBe(false);
    expect(parseSafeExpression("x + y")!.usesY).toBe(true);
  });

  it("refuses anything outside the whitelisted grammar rather than guessing", () => {
    expect(parseSafeExpression("alert(1)")).toBeNull();
    expect(parseSafeExpression("x; DROP TABLE users")).toBeNull();
    expect(parseSafeExpression("document.cookie")).toBeNull();
    expect(parseSafeExpression("2 + ")).toBeNull();
    expect(parseSafeExpression("")).toBeNull();
    expect(parseSafeExpression("z + 1")).toBeNull(); // only x/y are valid variables
  });

  it("never divides by zero into Infinity/NaN - returns 0 instead", () => {
    const parsed = parseSafeExpression("1 / x");
    expect(evaluateSafeExpression(parsed!.node, 0, 0)).toBe(0);
  });
});
