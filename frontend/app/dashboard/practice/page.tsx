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

  const { data: documents } = await supabase
    .from("documents")
    .select("id, status, error_message, processing_started_at")
    .order("created_at", { ascending: false });

  return (
    <main className="syn-page mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 pb-20 pt-8 sm:px-10">
      <header className="syn-inner-header">
        <span className="syn-eyebrow">Your learning / Practice</span>
        <h1 className="syn-section-title">Make it <em>stick.</em></h1>
        <p className="syn-lead">
          Targeted questions pulled from your weakest concepts, across every
          document.
        </p>
      </header>

      <PracticeSession initialDocuments={documents ?? []} />
    </main>
  );
}
