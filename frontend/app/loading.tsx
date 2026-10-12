import React from 'react';
import Image from 'next/image';

export default function Loading() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 space-y-4">
      <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-lg shadow-app-primary/20 border-2 border-app-badgeBg bg-white animate-pulse">
        <Image
          src="/ic_app_logo_round.png"
          alt="BloodLink Loading"
          fill
          priority
          className="object-cover"
        />
      </div>

      <div className="text-center">
        <div className="inline-flex items-center space-x-2 text-xs font-bold text-slate-700">
          <span className="w-2 h-2 rounded-full bg-app-primary animate-ping" />
          <span>Loading...</span>
        </div>
      </div>

      {/* Sleek Skeleton pulse line */}
      <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2">
        <div className="h-full bg-app-primary w-1/2 rounded-full animate-[shimmer_1.5s_infinite]" />
      </div>
    </div>
  );
}
