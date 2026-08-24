import Link from "next/link";
import TryDemoButton from "@/components/TryDemoButton";
import ThemeToggle from "@/components/ThemeToggle";
import Button from "@/components/Button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex justify-end p-6">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        <div
          aria-hidden
          className="h-1 w-16 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, var(--weak), var(--growing), var(--mastered))",
          }}
        />
        <h1 className="font-mono text-4xl font-semibold tracking-tight text-ink">
          Synaptiq
        </h1>
        <p className="max-w-md text-lg text-ink-muted">
          Upload your study materials and let Synaptiq figure out what you
          actually know.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup">
            <Button>Sign up</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary">Log in</Button>
          </Link>
          <TryDemoButton />
        </div>
      </div>
    </main>
  );
}
