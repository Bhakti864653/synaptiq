import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-semibold">Synaptiq</h1>
      <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
        Upload your study materials and let Synaptiq figure out what you
        actually know.
      </p>
      <div className="flex gap-4">
        <Link
          href="/signup"
          className="rounded-full bg-black px-6 py-3 text-white dark:bg-white dark:text-black"
        >
          Sign up
        </Link>
        <Link
          href="/login"
          className="rounded-full border px-6 py-3"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
