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
        <span className="syn-eyebrow">Your learning / Ask Synaptiq</span>
        <h1 className="syn-section-title">Curiosity <em>welcome.</em></h1>
        <p className="syn-lead">
          Anything at all - not just what&apos;s in your uploaded materials.
        </p>
      </header>

      <AskChat />
    </main>
  );
}
