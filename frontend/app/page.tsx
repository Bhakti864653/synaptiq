import Link from "next/link";
import TryDemoButton from "@/components/TryDemoButton";
import LandingIllustration from "@/components/LandingIllustration";
import LandingMascot from "@/components/LandingMascot";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-landing-paper">
      <LandingIllustration />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <span
          className="text-lg font-semibold text-landing-ink"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Synaptiq
        </span>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 items-center px-6 py-10 md:px-12">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-12 md:grid-cols-[1.15fr_0.85fr] md:gap-8">
          <div className="flex flex-col items-center gap-5 text-center md:items-start md:text-left">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-landing-glow-violet">
              Adaptive AI study platform
            </span>
            <h1
              className="text-5xl font-medium leading-[1.05] text-balance text-landing-ink md:text-6xl"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Know what you{" "}
              <em className="not-italic text-landing-accent-ink" style={{ fontStyle: "italic" }}>
                actually
              </em>{" "}
              know.
            </h1>
            <p className="max-w-md text-base leading-relaxed text-landing-ink-muted">
              Upload your study materials and let Synaptiq figure out what you
              actually know.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2 md:justify-start">
              <Link
                href="/signup"
                className="!rounded-[14px_6px_14px_6px] inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-landing-paper shadow-[4px_4px_0_rgba(242,166,63,0.35)] transition-transform hover:-translate-y-0.5"
                style={{ background: "var(--landing-ink)" }}
              >
                Sign up
              </Link>
              <Link
                href="/login"
                className="!rounded-[6px_14px_6px_14px] inline-flex items-center justify-center border-[1.5px] border-landing-ink px-5 py-2.5 text-sm font-medium text-landing-ink transition-transform hover:-translate-y-0.5"
              >
                Log in
              </Link>
              <TryDemoButton variant="organic" />
            </div>
          </div>

          <div className="relative flex justify-center md:justify-end">
            <div
              className="landing-glow-drift pointer-events-none absolute h-72 w-72 rounded-full opacity-70 blur-2xl"
              style={{
                background:
                  "radial-gradient(circle, var(--landing-glow-amber), transparent 70%)",
              }}
            />
            <div className="relative">
              <LandingMascot />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
