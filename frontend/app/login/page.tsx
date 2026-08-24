"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ErrorMessage from "@/components/ErrorMessage";
import TopNav from "@/components/TopNav";
import Card from "@/components/Card";
import Input from "@/components/Input";
import Button from "@/components/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  async function attemptLogin() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (error) {
      setError({ message: error.message, retry: attemptLogin });
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    attemptLogin();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-ink">Welcome back</h1>
          <p className="text-sm text-ink-muted">
            Log in to pick up where you left off.
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
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <ErrorMessage message={error.message} onRetry={error.retry} />}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Logging in..." : "Log in"}
            </Button>
          </form>
        </Card>
        <p className="text-center text-sm text-ink-muted">
          Need an account?{" "}
          <Link href="/signup" className="font-medium text-brand hover:underline">
            Sign up
          </Link>
        </p>
      </main>
    </div>
  );
}
