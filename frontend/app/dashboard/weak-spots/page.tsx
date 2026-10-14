import { redirect } from "next/navigation";

// "Focus areas" became the first section of Practice. Old links and
// bookmarks land there.
export default function WeakSpotsPage() {
  redirect("/dashboard/practice#weakest");
}
