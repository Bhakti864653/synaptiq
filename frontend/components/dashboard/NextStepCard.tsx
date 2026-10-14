import Link from "next/link";
import type { NextStep } from "@/lib/nextStep";

// The one thing to do now. Everything else on Home comes after it.
export default function NextStepCard({ step }: { step: NextStep }) {
  return (
    <section aria-labelledby="next-step-title" className="syn-priority">
      <div className="syn-next-content flex flex-col gap-4">
        <h2
          id="next-step-title"
          className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted"
        >
          Your next step
        </h2>
        <Link
          href={step.href}
          className="group inline-flex w-fit max-w-full items-center gap-3 rounded-[14px_6px_14px_6px] bg-brand px-6 py-4 text-lg font-semibold text-brand-ink transition-opacity hover:opacity-90 sm:text-xl"
        >
          <span className="min-w-0 break-words">{step.action}</span>
          <span aria-hidden className="transition-transform group-hover:translate-x-1">
            &rarr;
          </span>
        </Link>
        <p className="text-sm text-ink-muted">{step.detail}</p>
      </div>
    </section>
  );
}
