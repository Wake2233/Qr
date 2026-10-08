'use client';

import './globals.css';

/** Last-resort boundary when the root layout itself fails (renders its own <html>). */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <title>Something went wrong</title>
      <body className="bg-background text-foreground min-h-dvh font-sans antialiased">
        <main
          role="alert"
          className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-4"
        >
          <h1 className="text-3xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="opacity-70">Please reload the page.</p>
          {error.digest ? <p className="text-xs opacity-60">Reference: {error.digest}</p> : null}
          <button
            type="button"
            onClick={() => retry()}
            className="bg-primary text-primary-foreground h-11 w-fit rounded-md px-5 font-medium"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
