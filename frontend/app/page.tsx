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
      <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-ink">
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
      </div>
    </main>
  );
}
