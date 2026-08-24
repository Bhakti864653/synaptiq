"use client";

import { useVoiceInput } from "@/lib/useVoiceInput";

export default function VoiceButton({ onText }: { onText: (text: string) => void }) {
  const { start, stop, isRecording, isTranscribing, error } = useVoiceInput();

  function handleClick() {
    if (isRecording) {
      stop();
    } else {
      start(onText);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isTranscribing}
        aria-label={isRecording ? "Stop recording" : "Speak instead of typing"}
        title={isRecording ? "Stop recording" : "Speak instead of typing"}
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
      {error && <span className="text-xs text-weak">{error}</span>}
    </div>
  );
}
