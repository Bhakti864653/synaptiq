import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DocumentUpload from "../DocumentUpload";
import { authFetch } from "@/lib/authFetch";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/authFetch", () => ({
  authFetch: vi.fn(),
}));

const mockedAuthFetch = vi.mocked(authFetch);

const uploadMock = vi.fn();
const removeMock = vi.fn();
const insertSingleMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
    storage: {
      from: () => ({
        upload: uploadMock,
        remove: removeMock,
      }),
    },
    from: () => ({
      insert: () => ({
        select: () => ({
          single: insertSingleMock,
        }),
      }),
    }),
  }),
}));

function makeFile(name: string, content = "hello") {
  return new File([content], name, { type: "text/plain" });
}

describe("DocumentUpload file format validation and failure recovery", () => {
  beforeEach(() => {
    mockedAuthFetch.mockReset();
    uploadMock.mockReset();
    removeMock.mockReset();
    removeMock.mockResolvedValue({ data: null, error: null });
    insertSingleMock.mockReset();
  });

  it("rejects an unsupported extension before touching storage or the documents table", async () => {
    render(<DocumentUpload />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    // fireEvent (not userEvent.upload) deliberately bypasses the input's
    // own `accept` filtering, which would otherwise silently refuse to
    // "select" a .ppt file at all - this test needs the component's own
    // validation to be what rejects it, not the browser's file picker.
    Object.defineProperty(input, "files", { value: [makeFile("slides.ppt")] });
    fireEvent.change(input);

    expect(
      await screen.findByText(/Unsupported file type\. Please upload a/),
    ).toBeInTheDocument();
    expect(uploadMock).not.toHaveBeenCalled();
    expect(insertSingleMock).not.toHaveBeenCalled();
  });

  it("cleans up the orphaned storage file when the document insert fails", async () => {
    const user = userEvent.setup();
    uploadMock.mockResolvedValue({ error: null });
    insertSingleMock.mockResolvedValue({
      data: null,
      error: { message: "insert blew up" },
    });

    render(<DocumentUpload />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, makeFile("notes.txt"));

    expect(await screen.findByText("insert blew up")).toBeInTheDocument();
    expect(uploadMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(removeMock).toHaveBeenCalledTimes(1));
    const [[uploadedPath]] = uploadMock.mock.calls;
    expect(removeMock).toHaveBeenCalledWith([uploadedPath]);
  });

  it("does not clear the error when a retry's response is still not ok", async () => {
    const user = userEvent.setup();
    uploadMock.mockResolvedValue({ error: null });
    insertSingleMock.mockResolvedValue({ data: { id: "doc-1" }, error: null });
    mockedAuthFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ detail: "processing exploded" }),
    } as Response);

    render(<DocumentUpload />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, makeFile("notes.txt"));

    expect(await screen.findByText("processing exploded")).toBeInTheDocument();

    // Retry, still failing - a resolved-but-not-ok response must not be
    // treated as success just because the fetch call itself didn't throw.
    mockedAuthFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ detail: "still broken" }),
    } as Response);
    await user.click(screen.getByText("Try again"));

    expect(await screen.findByText("still broken")).toBeInTheDocument();
  });

  it("clears the error once a retry actually succeeds", async () => {
    const user = userEvent.setup();
    uploadMock.mockResolvedValue({ error: null });
    insertSingleMock.mockResolvedValue({ data: { id: "doc-1" }, error: null });
    mockedAuthFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ detail: "processing exploded" }),
    } as Response);

    render(<DocumentUpload />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, makeFile("notes.txt"));
    expect(await screen.findByText("processing exploded")).toBeInTheDocument();

    mockedAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "processed", chunk_count: 1 }),
    } as Response);
    await user.click(screen.getByText("Try again"));

    await waitFor(() =>
      expect(screen.queryByText("processing exploded")).not.toBeInTheDocument(),
    );
  });
});
