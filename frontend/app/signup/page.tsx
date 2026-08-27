"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ErrorMessage from "@/components/ErrorMessage";
import Card from "@/components/Card";
import Input from "@/components/Input";
import Button from "@/components/Button";
import GradientShell from "@/components/GradientShell";

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
    <GradientShell>
      <main className="relative z-10 mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-ink">Create your account</h1>
          <p className="text-sm text-ink-muted">
            Upload your first study material in under a minute.
          </p>
        </div>
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-ink">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-ink">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <ErrorMessage message={error.message} onRetry={error.retry} />}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating account..." : "Sign up"}
            </Button>
          </form>
        </Card>
        <p className="text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand hover:underline">
            Log in
          </Link>
        </p>
      </main>
    </GradientShell>
  );
}
