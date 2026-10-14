import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AskChat from "./AskChat";

export default async function AskPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="syn-page mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 pb-20 pt-8 sm:px-10">
      <header className="syn-inner-header">
        <h1 className="syn-section-title">General questions (not from your notes)</h1>
        <p className="syn-lead">
          Ask anything here. These answers come from general knowledge, not your
          uploaded materials. For answers from your own notes, open a material and
          use its Tutor.
        </p>
      </header>

      <AskChat />
    </main>
  );
}
