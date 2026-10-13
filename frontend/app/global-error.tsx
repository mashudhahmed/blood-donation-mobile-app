'use client';

import React, { useEffect } from 'react';
import './globals.css';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Critical Global Error caught:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-4 font-sans text-slate-900 antialiased">
        <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_48px_-16px_rgba(15,23,42,0.2)]">
          <div className="h-1 bg-[#C62828]" />
          <div className="space-y-6 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-100 bg-red-50">
              <AlertTriangle className="h-6 w-6 text-[#C62828]" aria-hidden />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">BloodLink hit a critical error</h1>
              <p className="text-sm leading-relaxed text-slate-500">
                The app couldn&apos;t start. Reloading usually fixes it.
              </p>
              {error?.digest && (
                <p className="pt-1 font-mono text-[11px] text-slate-400">Reference: {error.digest}</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#C62828] px-4 py-3 text-sm font-bold text-white shadow-md shadow-[#C62828]/25 outline-none transition-colors hover:bg-[#B71C1C] focus-visible:ring-2 focus-visible:ring-[#C62828] focus-visible:ring-offset-2"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Reload app
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
