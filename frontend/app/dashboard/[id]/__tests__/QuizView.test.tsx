import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuizView from "../QuizView";
import { authFetch } from "@/lib/authFetch";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/authFetch", () => ({
  authFetch: vi.fn(),
}));

const mockedAuthFetch = vi.mocked(authFetch);

const questions = [
  {
    id: "q1",
    concept_id: "c1",
    question_text: "What is a weight in a neural network?",
    options: [
      "A bias term",
      "A learned parameter",
      "An activation function",
      "A loss value",
    ],
  },
];

function renderQuiz() {
  return render(
    <QuizView
      documentId="doc1"
      status="quiz_ready"
      concepts={[{ id: "c1", name: "Weights and Biases" }]}
      questions={questions}
      mastery={[{ concept_id: "c1", mastery_score: 0 }]}
    />,
  );
}

function mockSubmitResponse(isCorrect: boolean) {
  mockedAuthFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      mastery_updates: [{ concept_id: "c1", mastery_score: isCorrect ? 100 : 0 }],
      results: [{ question_id: "q1", is_correct: isCorrect, correct_index: 1 }],
    }),
  } as Response);
}

describe("QuizView quiz submission flow", () => {
  beforeEach(() => {
    mockedAuthFetch.mockReset();
  });

  it("renders the quiz question with its answer options", () => {
    renderQuiz();

    expect(
      screen.getByText("What is a weight in a neural network?"),
    ).toBeInTheDocument();
    for (const option of questions[0].options) {
      expect(screen.getByText(option)).toBeInTheDocument();
    }
  });

  it("submits the selected answer and confidence to /quiz/submit", async () => {
    const user = userEvent.setup();
    mockSubmitResponse(true);
    renderQuiz();

    await user.click(screen.getByText("A learned parameter"));
    await user.click(screen.getByLabelText("Confidence 4 out of 5"));
    await user.click(screen.getByRole("button", { name: "Submit answers" }));

    await waitFor(() =>
      expect(mockedAuthFetch).toHaveBeenCalledWith(
        "/quiz/submit",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify([
            { question_id: "q1", selected_index: 1, confidence: 4 },
          ]),
        }),
      ),
    );
  });

  it("shows correct/incorrect feedback after submission", async () => {
    const user = userEvent.setup();
    mockSubmitResponse(true);
    renderQuiz();

    await user.click(screen.getByText("A learned parameter"));
    await user.click(screen.getByLabelText("Confidence 4 out of 5"));
    await user.click(screen.getByRole("button", { name: "Submit answers" }));

    expect(await screen.findByText("Correct")).toBeInTheDocument();
  });
});
