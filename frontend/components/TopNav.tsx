import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import LogoutButton from "@/app/dashboard/LogoutButton";
import SearchBox from "./SearchBox";

export default function TopNav({ showLogout = false }: { showLogout?: boolean }) {
  return (
    <header className="sticky top-0 z-40 flex items-center gap-4 border-b border-line bg-paper px-6 py-3">
      <Link
        href={showLogout ? "/dashboard" : "/"}
        className="shrink-0 text-lg font-semibold text-ink"
        style={{ fontFamily: "var(--font-fraunces)" }}
      >
        Synaptiq
      </Link>
      {showLogout && <SearchBox />}
      <div className="ml-auto flex items-center gap-4">
        {showLogout && <LogoutButton />}
        <ThemeToggle />
      </div>
    </header>
  );
}
