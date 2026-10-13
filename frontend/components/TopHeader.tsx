'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Bell, MessageSquare, LogOut } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface TopHeaderProps {
  onOpenMessages?: () => void;
  onOpenNotifications?: () => void;
}

export default function TopHeader({ onOpenMessages, onOpenNotifications }: TopHeaderProps) {
  const { role, user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    if (!showNotifications && !showProfileMenu) return;

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(target)) setShowProfileMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showNotifications, showProfileMenu]);

  const roleBadge =
    role === 'ADMIN'
      ? { label: 'Admin', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
      : role === 'HOSPITAL'
        ? { label: user.position || 'Hospital Desk', tone: 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]' }
        : { label: user.position || 'Blood Bank', tone: 'bg-amber-50 text-amber-800 border-amber-200' };

  const iconButton =
    'relative cursor-pointer rounded-xl p-2 text-slate-500 outline-none transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-[#C62828]';

  return (
    <header className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white/90 px-6 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:px-8">
      <div className="min-w-0">
        <span className="block text-xs font-medium leading-tight text-slate-400">Welcome back</span>
        <h2 className="truncate text-sm font-bold leading-tight tracking-tight text-slate-900 sm:text-base">
          {user.name}
        </h2>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {onOpenMessages && (
          <button
            type="button"
            onClick={onOpenMessages}
            aria-label="Open messages"
            title="Messages"
            className={iconButton}
          >
            <MessageSquare className="h-[18px] w-[18px]" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#E53935] ring-2 ring-white" />
          </button>
        )}

        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => {
              if (onOpenNotifications) onOpenNotifications();
              else setShowNotifications((v) => !v);
            }}
            aria-label="Notifications"
            aria-expanded={showNotifications}
            title="Notifications"
            className={iconButton}
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#E53935] ring-2 ring-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white text-xs shadow-[0_16px_40px_-12px_rgba(15,23,42,0.25)] animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-900">
                <span>Notifications</span>
                <span className="rounded-full bg-[#FFEBEE] px-2 py-0.5 text-[11px] font-bold text-[#C62828]">
                  Live
                </span>
              </div>
              <div className="px-4 py-8 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <Bell className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700">You&apos;re all caught up</p>
                <p className="mx-auto mt-1 max-w-[220px] text-xs leading-relaxed text-slate-400">
                  New requisitions and donor activity will show up here.
                </p>
              </div>
            </div>
          )}
        </div>

        <span
          className={`ml-1 hidden rounded-full border px-3 py-1 text-xs font-semibold sm:inline-block ${roleBadge.tone}`}
        >
          {roleBadge.label}
        </span>

        <div ref={profileRef} className="relative ml-1">
          <button
            type="button"
            onClick={() => setShowProfileMenu((v) => !v)}
            aria-label="Account menu"
            aria-expanded={showProfileMenu}
            className="cursor-pointer rounded-full p-0.5 ring-2 ring-emerald-500/20 outline-none transition-shadow hover:ring-emerald-500/50 focus-visible:ring-emerald-500/70"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-xs font-extrabold text-white">
              {user.avatarLetter || user.name.charAt(0)}
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white text-xs shadow-[0_16px_40px_-12px_rgba(15,23,42,0.25)] animate-in fade-in zoom-in-95 duration-150">
              <div className="space-y-0.5 border-b border-slate-100 px-4 py-3">
                <div className="truncate text-sm font-bold text-slate-900">{user.name}</div>
                <div className="truncate text-xs text-slate-400">{user.email}</div>
                {user.badge && <div className="pt-1 text-xs font-semibold text-[#C62828]">{user.badge}</div>}
                <div className="truncate text-xs text-slate-400">{user.organization}</div>
              </div>
              <div className="p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-rose-600 outline-none transition-colors hover:bg-rose-50 focus-visible:bg-rose-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            </div>
          )}
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
