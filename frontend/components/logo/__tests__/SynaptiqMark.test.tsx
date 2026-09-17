import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SynaptiqMark from "../SynaptiqMark";
import SynaptiqLogo from "../SynaptiqLogo";

describe("SynaptiqMark", () => {
  it("renders an accessible title when one is provided", () => {
    const { container } = render(<SynaptiqMark title="Synaptiq" />);
    expect(container.querySelector("title")?.textContent).toBe("Synaptiq");
    expect(container.querySelector("svg")).toHaveAttribute("role", "img");
  });

  it("hides itself from assistive tech when used purely decoratively", () => {
    const { container } = render(<SynaptiqMark />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("uses a linear gradient fill by default and currentColor in mono mode", () => {
    const { container: gradientContainer } = render(<SynaptiqMark variant="gradient" />);
    expect(gradientContainer.querySelector("linearGradient")).not.toBeNull();
    // The top-node circle (index 1 - index 0 is the always-solid violet
    // synapse dot) is the one that actually varies by variant.
    const gradientFill = gradientContainer.querySelectorAll("circle")[1]?.getAttribute("fill");
    expect(gradientFill).toMatch(/^url\(#/);

    const { container: monoContainer } = render(<SynaptiqMark variant="mono" />);
    expect(monoContainer.querySelector("linearGradient")).toBeNull();
    const monoFill = monoContainer.querySelectorAll("circle")[1]?.getAttribute("fill");
    expect(monoFill).toBe("currentColor");
  });

  it("renders two distinct gradient ids across two mounted instances", () => {
    const { container } = render(
      <div>
        <SynaptiqMark />
        <SynaptiqMark />
      </div>,
    );
    const ids = Array.from(container.querySelectorAll("linearGradient")).map((el) =>
      el.getAttribute("id"),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("SynaptiqLogo", () => {
  it("renders both the mark and the Synaptiq wordmark text", () => {
    const { container, getByText } = render(<SynaptiqLogo />);
    expect(container.querySelector("svg")).not.toBeNull();
    // Scoped to the wordmark <span> - the mark's own <title> element also
    // contains the literal text "Synaptiq" for accessibility purposes.
    expect(getByText("Synaptiq", { selector: "span" })).toBeInTheDocument();
  });
});
