import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";
import SearchBox from "./SearchBox";
import { SynaptiqLogo } from "@/components/logo";

export default function TopNav({
  showLogout = false,
  userName,
}: {
  showLogout?: boolean;
  userName?: string;
}) {
  return (
    <header className="sticky top-0 z-40 flex items-center gap-4 border-b border-line bg-paper px-6 py-3">
      <Link href={showLogout ? "/dashboard" : "/"} className="shrink-0 text-ink">
        <SynaptiqLogo size={24} wordmarkClassName="text-ink" />
      </Link>
      {showLogout && <SearchBox />}
      <div className="ml-auto flex items-center gap-4">
        <ThemeToggle />
        {showLogout && <UserMenu name={userName || "Account"} />}
      </div>
    </header>
  );
}
