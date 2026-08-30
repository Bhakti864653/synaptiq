import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PracticeSession from "./PracticeSession";

export default async function PracticePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="gradient-hero rounded-2xl p-6">
        <h1 className="text-2xl font-semibold text-ink">Practice</h1>
        <p className="text-sm text-ink-muted">
          Targeted questions pulled from your weakest concepts, across every
          document.
        </p>
      </div>

      <PracticeSession />
    </main>
  );
}
