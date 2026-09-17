import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RetryProcessingButton from "../RetryProcessingButton";
import { authFetch } from "@/lib/authFetch";

vi.mock("@/lib/authFetch", () => ({
  authFetch: vi.fn(),
}));

const mockedAuthFetch = vi.mocked(authFetch);

describe("RetryProcessingButton", () => {
  beforeEach(() => {
    mockedAuthFetch.mockReset();
  });

  it("extracts the structured message on a normal processing failure without crashing", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    mockedAuthFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        detail: {
          code: "EXTRACTION_FAILED",
          message: "No extractable text found in this file.",
        },
      }),
    } as Response);

    render(<RetryProcessingButton documentId="doc1" onResult={onResult} />);
    await user.click(screen.getByRole("button", { name: "Retry processing" }));

    expect(onResult).toHaveBeenCalledWith({
      status: "error",
      error_message: "No extractable text found in this file.",
    });
  });

  it("falls back to a plain-string detail when the backend sends one", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    mockedAuthFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: "Unsupported file type." }),
    } as Response);

    render(<RetryProcessingButton documentId="doc1" onResult={onResult} />);
    await user.click(screen.getByRole("button", { name: "Retry processing" }));

    expect(onResult).toHaveBeenCalledWith({
      status: "error",
      error_message: "Unsupported file type.",
    });
  });

  it("treats a 409 ALREADY_PROCESSING response as still-processing, not a failure", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    mockedAuthFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        detail: {
          code: "ALREADY_PROCESSING",
          message: "This document is already being processed.",
        },
      }),
    } as Response);

    render(<RetryProcessingButton documentId="doc1" onResult={onResult} />);
    await user.click(screen.getByRole("button", { name: "Retry processing" }));

    expect(
      await screen.findByText("This document is already being processed."),
    ).toBeInTheDocument();
    // The document must never be flipped to "error" for a 409 - it's still
    // genuinely processing, just via someone else's in-flight request.
    expect(onResult).not.toHaveBeenCalled();
  });

  it("never renders the raw detail object, even if it lacked a message field", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    mockedAuthFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ detail: { code: "ALREADY_PROCESSING" } }),
    } as Response);

    render(<RetryProcessingButton documentId="doc1" onResult={onResult} />);

    // Rendering an object as a React child throws synchronously during
    // render - if this click doesn't throw, no object ever reached JSX.
    await expect(
      user.click(screen.getByRole("button", { name: "Retry processing" })),
    ).resolves.not.toThrow();

    expect(
      await screen.findByText("This document is already being processed."),
    ).toBeInTheDocument();
  });

  it("calls onResult with processed on a successful retry", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    mockedAuthFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "processed", chunk_count: 3 }),
    } as Response);

    render(<RetryProcessingButton documentId="doc1" onResult={onResult} />);
    await user.click(screen.getByRole("button", { name: "Retry processing" }));

    expect(onResult).toHaveBeenCalledWith({ status: "processed", error_message: null });
    expect(mockedAuthFetch).toHaveBeenCalledWith("/documents/doc1/process", {
      method: "POST",
    });
  });
});
