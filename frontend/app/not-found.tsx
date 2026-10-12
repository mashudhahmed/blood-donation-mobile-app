import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 max-w-lg w-full text-center shadow-xl space-y-6">
        <div className="relative mx-auto w-20 h-20 rounded-2xl overflow-hidden shadow-md shadow-app-primary/10 border border-red-100 bg-white">
          <Image
            src="/ic_app_logo_round.png"
            alt="BloodLink Logo"
            fill
            sizes="80px"
            priority
            className="object-cover"
          />
        </div>

        <div>
          <span className="text-4xl sm:text-5xl font-black text-app-primary tracking-tight block">
            404
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
            Page Not Found
          </h1>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            The page you requested could not be found.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 py-2.5 px-5 rounded-xl bg-app-primary hover:bg-app-primaryDark text-white font-bold text-xs shadow-md shadow-app-primary/20 transition-all hover:scale-[1.02]"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return Home</span>
          </Link>

          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 py-2.5 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
