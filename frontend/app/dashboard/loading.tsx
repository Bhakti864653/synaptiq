import { SynaptiqMark } from "@/components/logo";

// Next's route-level loading UI - shown while the dashboard's Server
// Component data fetch is in flight. A calm pulse on the mark itself
// rather than a generic spinner, matching ProcessingIndicator's
// non-alarming tone elsewhere in the app.
export default function DashboardLoading() {
  return (
    <main className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3">
      <SynaptiqMark size={40} className="animate-pulse text-ink-muted" title="Loading Synaptiq" />
      <p className="text-sm text-ink-muted">Loading your workspace…</p>
    </main>
  );
}
