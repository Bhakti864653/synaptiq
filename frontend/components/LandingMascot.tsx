"use client";

import { useEffect, useRef, useState } from "react";
import Mascot, { type MascotExpression } from "./Mascot";
import { randomClickQuip } from "@/lib/mascotMessages";

const DISPLAY_MS = 4200;

export default function LandingMascot() {
  const [message, setMessage] = useState<string | null>(null);
  const [expression, setExpression] = useState<MascotExpression>("excited");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleClick() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setExpression("celebrating");
    setMessage(randomClickQuip());
    timeoutRef.current = setTimeout(() => {
      setMessage(null);
      setExpression("excited");
    }, DISPLAY_MS);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {message && (
        <div
          className="animate-fade-up max-w-[240px] rounded-2xl rounded-bl-sm border border-line bg-surface px-3 py-2 text-sm text-ink shadow-lg"
          role="status"
        >
          {message}
        </div>
      )}
      <button
        type="button"
        onClick={handleClick}
        aria-label="Say hi to Spark"
        className="cursor-pointer transition-transform hover:scale-105"
      >
        <Mascot expression={expression} size={140} className="drop-shadow-xl" />
      </button>
    </div>
  );
}
