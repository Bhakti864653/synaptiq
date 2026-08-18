export default function ErrorMessage({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 underline">
          Try again
        </button>
      )}
    </div>
  );
}
