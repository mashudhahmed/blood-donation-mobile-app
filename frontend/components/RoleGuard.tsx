'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth, UserRole } from '@/lib/auth-context';
import { ShieldAlert, ArrowRight, Lock, LogIn, LogOut } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface RoleGuardProps {
  allowedRole: UserRole;
  children: React.ReactNode;
}

const ROLE_DASHBOARDS: Record<UserRole, { path: string; name: string }> = {
  ADMIN: { path: '/admin', name: 'Admin Dashboard' },
  HOSPITAL: { path: '/hospital', name: 'Hospital Dashboard' },
  BLOOD_BANK: { path: '/bloodbank', name: 'Blood Bank Dashboard' },
};

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Admin',
  HOSPITAL: 'Hospital',
  BLOOD_BANK: 'Blood Bank',
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[75vh] items-center justify-center p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_48px_-16px_rgba(15,23,42,0.18)]">
        {children}
      </div>
    </div>
  );
}

export default function RoleGuard({ allowedRole, children }: RoleGuardProps) {
  const { role, user, isAuthenticated, isLoading, logout } = useAuth();
  const [showSignoutConfirm, setShowSignoutConfirm] = useState(false);

  // While restoring session from localStorage/cookies, render smooth branded loading state
  // to avoid flashing "Sign in to continue" on page refresh
  if (isLoading) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center p-4">
        <div
          role="status"
          aria-live="polite"
          className="flex w-full max-w-sm flex-col items-center gap-5 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_24px_48px_-16px_rgba(15,23,42,0.12)]"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-100 bg-[linear-gradient(180deg,#FFFFFF_0%,#FFF1F2_100%)] p-2 shadow-[0_8px_20px_-8px_rgba(198,40,40,0.3)]">
            <div className="relative h-full w-full">
              <Image
                src="/ic_app_logo_card.png"
                alt="BloodLink logo"
                fill
                sizes="64px"
                priority
                className="object-contain"
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-base font-extrabold tracking-tight text-slate-900">
              Blood<span className="text-[#E53935]">Link</span>
            </div>
            <p className="text-xs text-slate-500">Restoring authorized portal workspace…</p>
          </div>
          <div className="h-1 w-44 overflow-hidden rounded-full bg-slate-100">
            <div className="bl-indeterminate h-full w-2/5 rounded-full bg-[#C62828]" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Shell>
        <div className="h-1 bg-[#C62828]" />
        <div className="space-y-6 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-100 bg-red-50">
            <Lock className="h-6 w-6 text-[#C62828]" aria-hidden />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Sign in to continue</h2>
            <p className="text-sm leading-relaxed text-slate-500">
              You need an authorized account to open the{' '}
              <span className="font-semibold text-slate-700">{ROLE_LABELS[allowedRole]}</span> portal.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#C62828] px-4 py-3 text-sm font-bold text-white shadow-md shadow-[#C62828]/25 outline-none transition-colors hover:bg-[#B71C1C] focus-visible:ring-2 focus-visible:ring-[#C62828] focus-visible:ring-offset-2"
          >
            <LogIn className="h-4 w-4" aria-hidden />
            Sign in
          </Link>
        </div>
      </Shell>
    );
  }

  if (role !== allowedRole) {
    const dashboard = ROLE_DASHBOARDS[role];

    return (
      <Shell>
        <div className="h-1 bg-amber-400" />
        <div className="space-y-6 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50">
            <ShieldAlert className="h-6 w-6 text-amber-600" aria-hidden />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Access restricted</h2>
            <p className="text-sm leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-700">{user.name}</span> is signed in as{' '}
              {ROLE_LABELS[role]}. That role can&apos;t open the {ROLE_LABELS[allowedRole]} portal.
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <Link
              href={dashboard.path}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B1528] px-4 py-3 text-sm font-bold text-white outline-none transition-colors hover:bg-[#16233D] focus-visible:ring-2 focus-visible:ring-[#0B1528] focus-visible:ring-offset-2"
            >
              Go to {dashboard.name}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={() => setShowSignoutConfirm(true)}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 outline-none transition-colors hover:border-red-200 hover:bg-red-50 hover:text-[#C62828] focus-visible:ring-2 focus-visible:ring-[#C62828] focus-visible:ring-offset-2"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </button>
          </div>
        </div>

        <ConfirmModal
          isOpen={showSignoutConfirm}
          onClose={() => setShowSignoutConfirm(false)}
          onConfirm={() => {
            setShowSignoutConfirm(false);
            logout();
          }}
          title="Sign out of BloodLink?"
          description="You will need to sign in again with authorized credentials to access this portal."
          confirmText="Sign Out"
          variant="danger"
          icon={LogOut}
        />
      </Shell>
    );
  }

  return <>{children}</>;
}
