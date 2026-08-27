"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/Card";
import Input from "@/components/Input";
import Button from "@/components/Button";
import ErrorMessage from "@/components/ErrorMessage";

export default function SettingsPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(
    null,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);
    setError(null);

    if (password !== confirmPassword) {
      setError({ message: "Passwords don't match.", retry: () => {} });
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      setError({ message: updateError.message, retry: () => handleSubmit(e) });
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setSuccess(true);
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <div className="gradient-hero rounded-2xl p-6">
        <h1 className="text-2xl font-semibold text-ink">Account settings</h1>
        <p className="text-sm text-ink-muted">Manage your login and security.</p>
      </div>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-ink">Change password</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-ink">
              New password
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
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-ink">
              Confirm new password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          {success && (
            <p className="text-sm text-mastered">Password updated.</p>
          )}
          {error && <ErrorMessage message={error.message} onRetry={error.retry} />}
          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? "Saving..." : "Update password"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
