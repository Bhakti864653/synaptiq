"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ErrorMessage from "@/components/ErrorMessage";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  async function attemptSignup() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (error) {
      setError({ message: error.message, retry: attemptSignup });
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    attemptSignup();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border px-3 py-2"
        />
        <input
          type="password"
          placeholder="Password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border px-3 py-2"
        />
        {error && <ErrorMessage message={error.message} onRetry={error.retry} />}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>
      <p className="text-sm">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
