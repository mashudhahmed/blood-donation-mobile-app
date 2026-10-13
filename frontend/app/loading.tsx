import React from 'react';
import Image from 'next/image';

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[70vh] flex-col items-center justify-center gap-5 p-4"
    >
      <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-[#FECDD3] bg-white shadow-[0_8px_24px_-8px_rgba(198,40,40,0.35)]">
        <Image
          src="/ic_app_logo_round.png"
          alt=""
          fill
          sizes="64px"
          priority
          className="object-cover"
        />
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-semibold text-slate-700">Loading…</p>
        <div className="h-1 w-44 overflow-hidden rounded-full bg-slate-200">
          <div className="bl-indeterminate h-full w-2/5 rounded-full bg-[#C62828]" />
        </div>
      </div>
      <span className="sr-only">Loading content</span>
    </div>
  );
}
