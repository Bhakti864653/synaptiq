"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyErrorMessage } from "@/lib/friendlyError";
import ErrorMessage from "./ErrorMessage";

export default function TryDemoButton() {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(
    null,
  );

  async function startDemo() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/demo/start`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed (${res.status})`);
      }
      const { access_token, refresh_token } = await res.json();

      const supabase = createClient();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (sessionError) throw sessionError;

      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError({ message: friendlyErrorMessage(e), retry: startDemo });
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={startDemo}
        disabled={starting}
        className="rounded-full border px-6 py-3 disabled:opacity-50"
      >
        {starting ? "Setting up your demo..." : "Try the demo"}
      </button>
      {error && <ErrorMessage message={error.message} onRetry={error.retry} />}
    </div>
  );
}
