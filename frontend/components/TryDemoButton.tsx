"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyErrorMessage } from "@/lib/friendlyError";
import ErrorMessage from "./ErrorMessage";
import Button from "./Button";

export default function TryDemoButton({
  variant = "secondary",
}: {
  variant?: "secondary" | "organic";
}) {
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
      <Button variant={variant} onClick={startDemo} disabled={starting}>
        {starting ? "Setting up your demo..." : "Try the demo"}
      </Button>
      {error && <ErrorMessage message={error.message} onRetry={error.retry} />}
    </div>
  );
}
