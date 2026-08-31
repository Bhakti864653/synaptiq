"use client";

import { useEffect, useRef } from "react";
import { useMascot } from "@/lib/mascotContext";

// Fires once per page visit when there's a real streak worth mentioning -
// this is the "maintaining a streak" moment from the mascot brief, since
// there's no other natural place in the UI where a streak count changes.
export default function StreakGreeting({ streak }: { streak: number }) {
  const { celebrate } = useMascot();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current || streak < 2) return;
    firedRef.current = true;
    celebrate("celebrating", `${streak}-day streak! Keep it going.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak]);

  return null;
}
