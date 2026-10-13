'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home, ChevronDown } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('BloodLink App Error caught by error boundary:', error);
  }, [error]);

  return (
    <div className="flex min-h-[75vh] items-center justify-center p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_48px_-16px_rgba(15,23,42,0.18)]">
        <div className="h-1 bg-[#C62828]" />
        <div className="space-y-6 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-100 bg-red-50">
            <AlertCircle className="h-6 w-6 text-[#C62828]" aria-hidden />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Something went wrong</h2>
            <p className="mx-auto max-w-sm text-sm leading-relaxed text-slate-500">
              We couldn&apos;t load this page. Try again, or head back to the home screen.
            </p>
          </div>

          {(error?.message || error?.digest) && (
            <details className="group rounded-xl border border-slate-200 bg-slate-50 text-left">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-600 outline-none focus-visible:ring-2 focus-visible:ring-[#C62828] [&::-webkit-details-marker]:hidden">
                Technical details
                <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="space-y-1.5 border-t border-slate-200 px-4 py-3 font-mono text-[11px] leading-relaxed text-slate-600">
                {error.digest && (
                  <p>
                    <span className="text-slate-400">Reference:</span> {error.digest}
                  </p>
                )}
                {error.message && <p className="max-h-28 overflow-y-auto break-words">{error.message}</p>}
              </div>
            </details>
          )}

          <div className="flex flex-col items-stretch justify-center gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#C62828] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[#C62828]/25 outline-none transition-colors hover:bg-[#B71C1C] focus-visible:ring-2 focus-visible:ring-[#C62828] focus-visible:ring-offset-2"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#C62828] focus-visible:ring-offset-2"
            >
              <Home className="h-4 w-4" aria-hidden />
              Go home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
