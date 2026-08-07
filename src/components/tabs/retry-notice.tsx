"use client";

/**
 * A Tab's failure, and the button that tries again. Every Tab reaches out of the browser for what
 * it shows — a translation, a tafsir, an answer from the reader's own provider — and every one of
 * those can fail in a way only the reader can decide what to do about.
 */
export function RetryNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="px-1 py-6 text-sm">
      <p className="text-red-700 dark:text-red-400">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 rounded-lg border border-black/15 px-3 py-1.5 hover:bg-black/[0.06] dark:border-white/15 dark:hover:bg-white/[0.08]"
      >
        Try again
      </button>
    </div>
  );
}
