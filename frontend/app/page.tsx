import Link from "next/link";
import TryDemoButton from "@/components/TryDemoButton";
import Button from "@/components/Button";
import GradientShell from "@/components/GradientShell";

export default function Home() {
  return (
    <GradientShell>
      <main className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
        <h1 className="bg-gradient-to-r from-brand to-accent-2 bg-clip-text pb-2 text-6xl font-bold leading-[1.15] tracking-tight text-transparent md:text-7xl">
          Synaptiq
        </h1>
        <p className="max-w-md text-base text-ink-muted">
          Upload your study materials and let Synaptiq figure out what you
          actually know.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <Link href="/signup">
            <Button>Sign up</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary">Log in</Button>
          </Link>
          <TryDemoButton />
        </div>
      </main>
    </GradientShell>
  );
}
