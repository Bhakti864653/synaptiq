"use client";

import { useState } from "react";
import VoiceButton from "@/components/VoiceButton";
import { matchSpokenAnswer } from "@/lib/matchSpokenAnswer";

type Question = {
  id: string;
  concept_id: string;
  question_text: string;
  options: string[];
};
type Result = { is_correct: boolean; correct_index: number };

export default function QuestionBlock({
  question,
  selected,
  result,
  onSelect,
  confidence,
  onConfidence,
  voice = false,
}: {
  question: Question;
  selected: number | undefined;
  result: Result | undefined;
  onSelect: (index: number) => void;
  confidence?: number | undefined;
  onConfidence?: (value: number) => void;
  voice?: boolean;
}) {
  const [voiceHint, setVoiceHint] = useState<string | null>(null);

  function handleVoiceAnswer(transcript: string) {
    const index = matchSpokenAnswer(transcript, question.options);
    if (index === null) {
      setVoiceHint(`Didn't catch that — try saying the letter, like "B".`);
      return;
    }
    setVoiceHint(null);
    onSelect(index);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <p className="text-ink">{question.question_text}</p>
        {voice && !result && <VoiceButton onText={handleVoiceAnswer} />}
      </div>
      {voiceHint && <p className="text-xs text-ink-muted">{voiceHint}</p>}
      {question.options.map((option, i) => (
        <label
          key={i}
          className={`flex items-center gap-2 ${
            result && i === result.correct_index
              ? "font-medium text-mastered"
              : result && i === selected && !result.is_correct
                ? "text-weak"
                : "text-ink"
          }`}
        >
          <input
            type="radio"
            name={question.id}
            checked={selected === i}
            disabled={!!result}
            onChange={() => onSelect(i)}
            className="accent-brand"
          />
          {option}
        </label>
      ))}
      {selected !== undefined && !result && onConfidence && (
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-ink-muted">How confident are you?</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onConfidence(n)}
                aria-label={`Confidence ${n} out of 5`}
                className={`h-6 w-6 rounded-full border text-xs font-medium transition-colors ${
                  confidence === n
                    ? "border-brand bg-brand text-brand-ink"
                    : "border-line text-ink-muted hover:border-brand"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
      {result && (
        <p
          className={`text-sm font-medium ${result.is_correct ? "text-mastered" : "text-weak"}`}
        >
          {result.is_correct ? "Correct" : "Incorrect"}
        </p>
      )}
    </div>
  );
}
