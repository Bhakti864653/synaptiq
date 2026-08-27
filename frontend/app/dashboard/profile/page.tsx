"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/Card";
import Input from "@/components/Input";
import Button from "@/components/Button";
import ErrorMessage from "@/components/ErrorMessage";

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(
    null,
  );

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? "");
      setFullName((user?.user_metadata?.full_name as string) ?? "");
      setLoading(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });
    setSaving(false);

    if (updateError) {
      setError({ message: updateError.message, retry: () => handleSubmit(e) });
      return;
    }
    setSuccess(true);
  }

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
        <p className="text-sm text-ink-muted">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <div className="gradient-hero rounded-2xl p-6">
        <h1 className="text-2xl font-semibold text-ink">Profile</h1>
        <p className="text-sm text-ink-muted">Your account details.</p>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink">Email</label>
          <Input value={email} disabled />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fullName" className="text-sm font-medium text-ink">
              Display name
            </label>
            <Input
              id="fullName"
              placeholder="Your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          {success && <p className="text-sm text-mastered">Saved.</p>}
          {error && <ErrorMessage message={error.message} onRetry={error.retry} />}
          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
