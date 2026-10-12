'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console or error monitoring service
    console.error('BloodLink App Error caught by error boundary:', error);
  }, [error]);

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-lg w-full text-center shadow-xl space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-app-primary">
          <AlertCircle className="w-8 h-8 text-app-primary" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900">Something Went Wrong</h2>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            An unexpected error occurred. Please try again or return home.
          </p>
          {error?.message && (
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-left font-mono text-[11px] text-slate-700 max-h-28 overflow-y-auto break-words">
              {error.message}
            </div>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 py-2.5 px-5 rounded-xl bg-app-primary hover:bg-app-primaryDark text-white font-bold text-xs shadow-md shadow-app-primary/20 transition-all hover:scale-[1.02]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 py-2.5 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
