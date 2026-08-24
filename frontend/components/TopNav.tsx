import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import LogoutButton from "@/app/dashboard/LogoutButton";

export default function TopNav({ showLogout = false }: { showLogout?: boolean }) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-paper px-6 py-3">
      <Link
        href={showLogout ? "/dashboard" : "/"}
        className="text-base font-semibold text-ink"
      >
        Synaptiq
      </Link>
      <div className="flex items-center gap-4">
        {showLogout && <LogoutButton />}
        <ThemeToggle />
      </div>
    </header>
  );
}
