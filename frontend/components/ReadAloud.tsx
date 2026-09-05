"use client";

import { useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { friendlyErrorMessage } from "@/lib/friendlyError";
import {
  pauseSpeaking,
  resumeSpeaking,
  speak,
  speechOutputSupported,
  stopSpeaking,
} from "@/lib/speak";
import { useVoiceInput } from "@/lib/useVoiceInput";
import Button from "@/components/Button";
import ErrorMessage from "@/components/ErrorMessage";

type Message = { role: "user" | "assistant"; content: string };
type Phase = "idle" | "playing" | "paused" | "listening" | "answering" | "speaking-answer";

// Reads the guide's explanation paragraphs aloud with the browser's native
// TTS, and lets the student interrupt at any point to ask the existing
// Tutor a question by voice - narration is cancelled the instant the mic is
// tapped (so it can never hear itself), the question goes to the same
// /tutor endpoint TutorChat uses, the answer is spoken back, and narration
// then resumes from the paragraph it left off on.
export default function ReadAloud({
  paragraphs,
  documentId,
}: {
  paragraphs: string[];
  documentId: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [history, setHistory] = useState<Message[]>([]);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(
    null,
  );

  const resumeIndexRef = useRef<number | null>(null);
  const wasRecordingRef = useRef(false);
  // Guards a handleQuestion call that's still in flight (tutor fetch or
  // speaking the answer) against acting after the user has hit Stop.
  const stoppedRef = useRef(false);

  const { start, stop, isRecording, isTranscribing, error: voiceError } =
    useVoiceInput();

  useEffect(() => {
    setMounted(true);
    return () => {
      stopSpeaking();
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If recording ends without ever calling handleQuestion (no speech heard,
  // permission denied, etc.) phase would otherwise be stuck on "listening".
  useEffect(() => {
    if (wasRecordingRef.current && !isRecording && phase === "listening") {
      setPhase(resumeIndexRef.current !== null ? "paused" : "idle");
    }
    wasRecordingRef.current = isRecording;
  }, [isRecording, phase]);

  function speakParagraphsFrom(startIndex: number) {
    stopSpeaking();
    paragraphs.slice(startIndex).forEach((text, offset) => {
      const index = startIndex + offset;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setActiveIndex(index);
      utterance.onend = () => {
        if (index === paragraphs.length - 1) {
          setPhase("idle");
          setActiveIndex(null);
        }
      };
      window.speechSynthesis.speak(utterance);
    });
    setPhase("playing");
  }

  function handleReadAloudClick() {
    stoppedRef.current = false;
    if (phase === "playing") {
      pauseSpeaking();
      setPhase("paused");
    } else if (phase === "paused") {
      resumeSpeaking();
      setPhase("playing");
    } else if (phase === "idle") {
      speakParagraphsFrom(0);
    }
  }

  function handleMicClick() {
    if (isRecording) {
      stop();
      return;
    }
    stoppedRef.current = false;
    resumeIndexRef.current =
      phase === "playing" || phase === "paused" ? activeIndex ?? 0 : null;
    stopSpeaking();
    setError(null);
    setPhase("listening");
    start(handleQuestion);
  }

  // Stops everything immediately - narration, an active recording, and any
  // tutor answer still in flight - and resets to idle. Always reachable
  // whenever something is active, independent of the Pause/Resume toggle.
  function handleStop() {
    stoppedRef.current = true;
    stopSpeaking();
    if (isRecording) stop();
    resumeIndexRef.current = null;
    setActiveIndex(null);
    setError(null);
    setPhase("idle");
  }

  async function handleQuestion(question: string) {
    stoppedRef.current = false;
    setPhase("answering");
    const priorHistory = history;
    setHistory([...priorHistory, { role: "user", content: question }]);
    try {
      const res = await authFetch(`/documents/${documentId}/tutor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history: priorHistory }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed (${res.status})`);
      }
      const body = await res.json();
      if (stoppedRef.current) return;
      setHistory([
        ...priorHistory,
        { role: "user", content: question },
        { role: "assistant", content: body.answer },
      ]);
      setPhase("speaking-answer");
      speak(body.answer, () => {
        if (stoppedRef.current) return;
        const resumeIndex = resumeIndexRef.current;
        resumeIndexRef.current = null;
        if (resumeIndex !== null) {
          speakParagraphsFrom(resumeIndex);
        } else {
          setPhase("idle");
        }
      });
    } catch (e) {
      if (stoppedRef.current) return;
      setError({ message: friendlyErrorMessage(e), retry: () => handleQuestion(question) });
      setPhase(resumeIndexRef.current !== null ? "paused" : "idle");
    }
  }

  const supported = mounted && speechOutputSupported();
  const micDisabled = isTranscribing || phase === "answering" || phase === "speaking-answer";

  return (
    <div className="flex flex-col gap-3">
      {supported && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleReadAloudClick}
            disabled={phase === "listening" || phase === "answering" || phase === "speaking-answer"}
            className="w-fit"
          >
            {phase === "playing" ? "Pause" : phase === "paused" ? "Resume" : "Read aloud"}
          </Button>

          <button
            type="button"
            onClick={handleMicClick}
            disabled={micDisabled}
            aria-label={isRecording ? "Stop and ask" : "Ask a question"}
            title={isRecording ? "Stop and ask" : "Ask a question"}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              isRecording
                ? "border-weak text-weak"
                : "border-line text-ink-muted hover:border-brand hover:text-brand"
            }`}
          >
            {isTranscribing ? (
              <span className="font-mono text-xs">...</span>
            ) : isRecording ? (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
                <rect x="6" y="6" width="12" height="12" rx="1.5" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
                <line x1="12" y1="18" x2="12" y2="22" />
              </svg>
            )}
          </button>

          {phase !== "idle" && (
            <>
              <span className="text-xs text-ink-muted">
                {phase === "playing" && "Playing…"}
                {phase === "paused" && "Paused"}
                {phase === "listening" && "Listening…"}
                {phase === "answering" && "Thinking…"}
                {phase === "speaking-answer" && "Answering…"}
              </span>
              <Button variant="ghost" onClick={handleStop} className="w-fit px-0">
                Stop
              </Button>
            </>
          )}
          {voiceError && <span className="text-xs text-weak">{voiceError}</span>}
        </div>
      )}

      {paragraphs.map((text, i) => (
        <p
          key={i}
          className={`rounded-md px-2 py-1 text-ink ${
            activeIndex === i ? "bg-brand/10" : ""
          }`}
        >
          {text}
        </p>
      ))}

      {supported && history.length > 0 && (
        <div className="flex flex-col gap-2">
          {history.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "max-w-[80%] self-end rounded-xl bg-brand px-3 py-2 text-sm text-brand-ink"
                  : "max-w-[80%] self-start rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink"
              }
            >
              {m.content}
            </div>
          ))}
        </div>
      )}

      {supported && error && <ErrorMessage message={error.message} onRetry={error.retry} />}
    </div>
  );
}
