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
      <body className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full text-center shadow-2xl space-y-5">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-xl font-black text-slate-900">Critical System Error</h1>
            <p className="text-xs text-slate-500 mt-2">
              A fatal error occurred while rendering the root application layout.
            </p>
            {error?.message && (
              <p className="mt-2 text-xs font-mono text-red-600 bg-red-50 p-2 rounded-lg break-words">
                {error.message}
              </p>
            )}
          </div>

          <button
            onClick={() => reset()}
            className="w-full inline-flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload Application</span>
          </button>
        </div>
      </body>
    </html>
  );
}
