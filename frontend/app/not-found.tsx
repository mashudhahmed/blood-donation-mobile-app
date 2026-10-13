import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Home, LogIn } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[75vh] items-center justify-center p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_48px_-16px_rgba(15,23,42,0.18)]">
        <div className="h-1 bg-[#C62828]" />
        <div className="space-y-6 p-8 text-center sm:p-10">
          <div className="relative mx-auto h-16 w-16 overflow-hidden rounded-2xl border border-[#FECDD3] bg-white shadow-[0_8px_24px_-8px_rgba(198,40,40,0.3)]">
            <Image
              src="/ic_app_logo_round.png"
              alt="BloodLink logo"
              fill
              sizes="64px"
              priority
              className="object-cover"
            />
          </div>

          <div className="space-y-2">
            <p className="text-5xl font-black tabular-nums tracking-tight text-[#C62828]">404</p>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">We can&apos;t find that page</h1>
            <p className="mx-auto max-w-xs text-sm leading-relaxed text-slate-500">
              The link may be broken, or the page may have moved.
            </p>
          </div>

          <div className="flex flex-col items-stretch justify-center gap-2.5 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C62828] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[#C62828]/25 outline-none transition-colors hover:bg-[#B71C1C] focus-visible:ring-2 focus-visible:ring-[#C62828] focus-visible:ring-offset-2"
            >
              <Home className="h-4 w-4" aria-hidden />
              Go home
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#C62828] focus-visible:ring-offset-2"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
