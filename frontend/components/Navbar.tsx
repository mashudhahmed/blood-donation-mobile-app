'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ShieldCheck, Building2, Database, LogOut, Bell } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export default function Navbar() {
  const pathname = usePathname();
  const { role, user, isAuthenticated, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // The login page has its own full-bleed banner
  if (pathname === '/login') return null;

  const workspace =
    role === 'ADMIN'
      ? { path: '/admin', label: 'Admin Command Hub', short: 'Admin', icon: ShieldCheck }
      : role === 'HOSPITAL'
        ? { path: '/hospital', label: 'Hospital Desk', short: 'Hospital', icon: Building2 }
        : { path: '/bloodbank', label: 'Blood Bank Hub', short: 'Blood Bank', icon: Database };

  const WorkspaceIcon = workspace.icon;

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-[linear-gradient(180deg,#CE2D2D_0%,#C62828_100%)] text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_4px_16px_-6px_rgba(120,16,16,0.5)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand + workspace */}
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={isAuthenticated ? workspace.path : '/login'}
              className="group flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#C62828]"
            >
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-white p-0.5 shadow-sm ring-1 ring-black/10 transition-transform duration-200 group-hover:scale-105">
                <Image
                  src="/ic_app_logo_round.png"
                  alt="BloodLink logo"
                  fill
                  priority
                  className="object-cover"
                />
              </div>
              <span className="text-xl font-black tracking-tight">
                Blood<span className="text-red-200">Link</span>
              </span>
            </Link>

            {isAuthenticated && (
              <>
                <span aria-hidden className="hidden h-5 w-px bg-white/25 sm:block" />
                <div className="hidden items-center gap-1.5 rounded-lg border border-white/15 bg-black/15 px-2.5 py-1 text-xs font-semibold sm:inline-flex">
                  <WorkspaceIcon className="h-3.5 w-3.5 text-red-200" aria-hidden />
                  <span className="truncate">{workspace.label}</span>
                </div>
              </>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold sm:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-70 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              All systems operational
            </div>

            <button
              type="button"
              aria-label="Notifications"
              title="Notifications"
              className="relative rounded-xl p-2 text-white/90 outline-none transition-colors hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-white ring-2 ring-[#C62828]" />
            </button>

            {isAuthenticated && (
              <div className="flex items-center gap-2.5 border-l border-white/20 pl-3">
                <span className="hidden items-center gap-1 rounded-md border border-white/20 bg-black/20 px-2 py-0.5 text-[11px] font-bold lg:inline-flex">
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  {workspace.short}
                </span>

                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-[#C62828] ring-2 ring-white/30">
                    {user.avatarLetter || user.name.charAt(0)}
                  </div>
                  <div className="hidden text-left xl:block">
                    <div className="max-w-[140px] truncate text-xs font-bold leading-tight">
                      {user.name.split(',')[0]}
                    </div>
                    <div className="max-w-[140px] truncate text-[11px] text-white/75">
                      {user.organization}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  aria-label="Sign out"
                  title="Sign out"
                  className="cursor-pointer rounded-xl p-2 text-white/80 outline-none transition-colors hover:bg-black/25 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          logout();
        }}
        title="Sign out of BloodLink?"
        description="You will need to sign in again with your authorized credentials to access this portal."
        confirmText="Sign Out"
        variant="danger"
        icon={LogOut}
      />
    </header>
  );
}
