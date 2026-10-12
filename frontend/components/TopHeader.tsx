'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Bell, MessageSquare, LogOut } from 'lucide-react';

interface TopHeaderProps {
  onOpenMessages?: () => void;
  onOpenNotifications?: () => void;
}

export default function TopHeader({ onOpenMessages, onOpenNotifications }: TopHeaderProps) {
  const { role, user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const getRoleBadge = () => {
    if (role === 'ADMIN') {
      return { label: 'Admin', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    } else if (role === 'HOSPITAL') {
      return { label: user.position || 'Hospital Desk', bg: 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]' };
    } else {
      return { label: user.position || 'Blood Bank', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
  };

  const badge = getRoleBadge();

  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] px-6 sm:px-8 flex items-center justify-between shrink-0 z-20">
      {/* Left: Welcome Greeting matching Screenshot reference */}
      <div>
        <span className="text-xs font-medium text-slate-400 block leading-tight">Welcome back</span>
        <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight">
          {user.name}
        </h2>
      </div>

      {/* Right: Actions, Badges & User Profile */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Messages / Inquiries Icon Button (Direct Donor Messaging) */}
        {onOpenMessages && (
          <button
            onClick={onOpenMessages}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative cursor-pointer"
            title="Direct Donor Messaging & Live Chat"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#E53935]" />
          </button>
        )}

        {/* Notification Bell matching Screenshot */}
        <div className="relative">
          <button
            onClick={() => {
              if (onOpenNotifications) {
                onOpenNotifications();
              } else {
                setShowNotifications(!showNotifications);
              }
            }}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative cursor-pointer"
            title="System Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#E53935] animate-pulse" />
          </button>

          {/* Notification Dropdown Flyout */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 text-xs animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-bold text-slate-900">
                <span>Recent System Alerts</span>
                <span className="text-[10px] text-[#C62828] bg-[#FFEBEE] px-1.5 py-0.5 rounded font-bold">Live</span>
              </div>
              <div className="py-6 text-center text-slate-500">
                <Bell className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700 text-xs">All Systems Operational</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Real-time alerts will appear here as requisitions and donor activities occur.</p>
              </div>
            </div>
          )}
        </div>

        {/* Role Pill matching Screenshot (e.g. Admin, Hospital CMO, Blood Bank) */}
        <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${badge.bg}`}>
          {badge.label}
        </span>

        {/* Avatar Chip with Circle Border matching Screenshot */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center space-x-2 p-0.5 rounded-full ring-2 ring-emerald-500/20 hover:ring-emerald-500/50 transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-extrabold flex items-center justify-center text-xs">
              {user.avatarLetter || user.name.charAt(0)}
            </div>
          </button>

          {/* Quick Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 text-xs animate-in fade-in">
              <div className="px-2 py-1.5 border-b border-slate-100">
                <div className="font-bold text-slate-900 truncate">{user.name}</div>
                <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                <div className="text-[10px] font-semibold text-[#C62828] mt-0.5">{user.badge}</div>
                <div className="text-[10px] text-slate-400 truncate">{user.organization}</div>
              </div>
              <div className="pt-2">
                <button
                  onClick={logout}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 font-bold flex items-center space-x-2 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
