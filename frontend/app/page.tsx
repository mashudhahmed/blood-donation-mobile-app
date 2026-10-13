'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function RootPage() {
  const router = useRouter();
  const { role, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
    } else if (role === 'ADMIN') {
      router.replace('/admin');
    } else if (role === 'HOSPITAL') {
      router.replace('/hospital');
    } else {
      router.replace('/bloodbank');
    }
  }, [isLoading, isAuthenticated, role, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] p-4">
      <div
        role="status"
        aria-live="polite"
        className="flex w-full max-w-sm flex-col items-center gap-5 rounded-3xl border border-[#E2E8F0] bg-white p-8 text-center shadow-[0_24px_48px_-16px_rgba(15,23,42,0.15)]"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[#FECDD3] bg-[linear-gradient(180deg,#FFFFFF_0%,#FFF1F2_100%)] p-2 shadow-[0_8px_24px_-8px_rgba(198,40,40,0.35)]">
          <div className="relative h-full w-full">
            <Image
              src="/ic_app_logo_card.png"
              alt="BloodLink logo"
              fill
              sizes="80px"
              priority
              className="object-contain"
            />
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-[#212121]">
            Blood<span className="text-[#E53935]">Link</span>
          </h1>
          <p className="text-sm text-slate-500">National blood transfusion and requisition network</p>
        </div>

        <div className="w-full space-y-2.5 pt-1">
          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="bl-indeterminate h-full w-2/5 rounded-full bg-[#C62828]" />
          </div>
          <p className="text-xs font-medium text-slate-500">Taking you to your portal…</p>
        </div>
      </div>
    </main>
  );
}
