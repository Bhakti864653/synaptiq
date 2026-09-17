// A calm, non-alarming "still working on it" indicator - three softly
// pulsing dots using the app's own neutral --line color, not a spinner or
// anything that reads as stuck/broken. Reused everywhere a document is
// "uploaded" or "processing".
export default function ProcessingIndicator({
  label = "We're preparing your material.",
}: {
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-muted" role="status">
      <span className="flex gap-1" aria-hidden>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand [animation-delay:200ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand [animation-delay:400ms]" />
      </span>
      {label}
    </div>
  );
}
