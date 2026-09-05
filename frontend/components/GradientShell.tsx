import Link from "next/link";
import CursorGlow from "./CursorGlow";
import LandingIllustration from "./LandingIllustration";
import ThemeToggle from "./ThemeToggle";

// Shared "Warm Margin" chrome for the login and signup pages - the same
// atmosphere as the landing page (asymmetric glow, synapse dots, warm
// palette) so the whole pre-auth flow feels like one place. The main app
// (dashboard and its tabs) intentionally keeps the flat, no-shadow/no-glow
// design and does not use this.
export default function GradientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-landing-paper">
      <LandingIllustration />
      <CursorGlow />
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <Link
          href="/"
          className="text-lg font-semibold text-landing-ink"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Synaptiq
        </Link>
        <ThemeToggle />
      </header>
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </div>
  );
}
