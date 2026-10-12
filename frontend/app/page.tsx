'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function RootPage() {
  const router = useRouter();
  const { role, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    } else {
      if (role === 'ADMIN') router.replace('/admin');
      else if (role === 'HOSPITAL') router.replace('/hospital');
      else router.replace('/bloodbank');
    }
  }, [isAuthenticated, role, router]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-[#E2E8F0] p-8 shadow-xl flex flex-col items-center text-center space-y-4">
        {/* App Logo Card */}
        <div className="w-20 h-20 rounded-2xl bg-[#FFF1F2] border border-[#FECDD3] p-2 flex items-center justify-center shadow-md">
          <div className="relative w-full h-full">
            <Image
              src="/ic_app_logo_card.png"
              alt="BloodLink Logo"
              fill
              priority
              className="object-contain"
            />
          </div>
        </div>

        <div>
          <h1 className="text-xl font-black text-[#212121] tracking-tight">
            Blood<span className="text-[#E53935]">Link</span>
          </h1>
          <p className="text-xs text-[#757575] font-medium mt-0.5">
            National Blood Transfusion & Requisition Network
          </p>
        </div>

        {/* Loading Spinner */}
        <div className="flex items-center space-x-2 text-xs font-bold text-[#E53935] pt-2">
          <svg
            className="animate-spin h-5 w-5 text-[#E53935]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Connecting to Authorized Portal...</span>
        </div>
      </div>
    </div>
  );
}
