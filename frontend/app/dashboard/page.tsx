import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DocumentUpload from "./DocumentUpload";
import LogoutButton from "./LogoutButton";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: documents } = await supabase
    .from("documents")
    .select("id, filename, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your study materials</h1>
        <LogoutButton />
      </div>

      <DocumentUpload />

      <ul className="flex flex-col gap-2">
        {documents?.length ? (
          documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between rounded border px-3 py-2"
            >
              <span>{doc.filename}</span>
              <span className="text-sm text-gray-500">{doc.status}</span>
            </li>
          ))
        ) : (
          <p className="text-sm text-gray-500">
            No documents uploaded yet.
          </p>
        )}
      </ul>
    </main>
  );
}
