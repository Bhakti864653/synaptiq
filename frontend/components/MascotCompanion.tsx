"use client";

import Mascot from "./Mascot";
import { useMascot } from "@/lib/mascotContext";
import { randomClickQuip } from "@/lib/mascotMessages";

// Fixed bottom-right companion. Idle and quiet by default so it doesn't
// compete with reading/studying; grows and speaks when celebrate() is
// called from wherever a real moment happens (finishing a quiz, starting
// a topic, etc) - or when someone just clicks it to say hi.
export default function MascotCompanion() {
  const { state, celebrate } = useMascot();
  const speaking = state.message !== null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {speaking && (
        <div
          className="animate-fade-up max-w-[220px] rounded-2xl rounded-br-sm border border-line bg-surface px-3 py-2 text-sm text-ink shadow-lg"
          role="status"
        >
          {state.message}
        </div>
      )}
      <button
        type="button"
        onClick={() => celebrate("excited", randomClickQuip())}
        aria-label="Say hi to Spark"
        className={`pointer-events-auto cursor-pointer transition-transform duration-300 hover:scale-105 ${speaking ? "scale-110" : "scale-100 opacity-80"}`}
      >
        <Mascot expression={state.expression} size={speaking ? 68 : 52} />
      </button>
    </div>
  );
}
