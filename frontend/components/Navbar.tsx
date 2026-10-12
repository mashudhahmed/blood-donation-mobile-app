'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  ShieldCheck,
  Building2,
  Database,
  LogOut,
  Bell,
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { role, user, isAuthenticated, logout } = useAuth();

  // On the login page, the full-bleed Android dark red banner takes precedence
  if (pathname === '/login') {
    return null;
  }

  // Role dashboard navigation configuration
  const getRoleDashboard = () => {
    if (role === 'ADMIN') {
      return { path: '/admin', label: 'Admin Command Hub', icon: ShieldCheck };
    } else if (role === 'HOSPITAL') {
      return { path: '/hospital', label: 'Hospital Desk', icon: Building2 };
    } else {
      return { path: '/bloodbank', label: 'Blood Bank Hub', icon: Database };
    }
  };

  const userDashboard = getRoleDashboard();

  return (
    <header className="sticky top-0 z-50 bg-[#C62828] text-white shadow-md border-b border-[#B71C1C]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Active Workspace Context */}
          <div className="flex items-center space-x-3">
            <Link
              href={isAuthenticated ? userDashboard.path : '/login'}
              className="flex items-center space-x-2.5 group"
            >
              <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-sm bg-white p-0.5 shrink-0 group-hover:scale-105 transition-transform">
                <Image
                  src="/ic_app_logo_round.png"
                  alt="BloodLink Logo"
                  fill
                  priority
                  className="object-cover"
                />
              </div>
              <span className="text-xl font-black tracking-tight text-white">
                Blood<span className="text-red-200">Link</span>
              </span>
            </Link>

            {isAuthenticated && (
              <>
                <span className="text-white/30 text-sm hidden sm:inline">&bull;</span>
                <div className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-black/20 border border-white/15 text-[11px] font-bold text-white tracking-wide">
                  <userDashboard.icon className="w-3.5 h-3.5 text-red-200" />
                  <span>{userDashboard.label}</span>
                </div>
              </>
            )}
          </div>

          {/* Right Controls: Operational Health, Notifications & Session Profile */}
          <div className="flex items-center space-x-3">
            {/* Live Cloud Connection Indicator */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Operational</span>
            </div>

            {/* Notification Bell */}
            <button
              className="p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/15 transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white" />
            </button>

            {/* User Session Profile & Sign Out */}
            {isAuthenticated && (
              <div className="flex items-center space-x-2 pl-3 border-l border-white/20">
                {/* Role Pill */}
                <span className="hidden lg:inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/25 text-white border border-white/20">
                  <ShieldCheck className="w-3 h-3 mr-1 text-white" />
                  {role === 'ADMIN' ? 'Admin' : role === 'HOSPITAL' ? 'Hospital' : 'Blood Bank'}
                </span>

                {/* Avatar & User Details */}
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-white text-[#C62828] flex items-center justify-center font-black text-xs ring-2 ring-white/30 shrink-0">
                    {user.avatarLetter || user.name.charAt(0)}
                  </div>
                  <div className="hidden xl:block text-left">
                    <div className="text-xs font-bold text-white leading-tight truncate max-w-[130px]">
                      {user.name.split(',')[0]}
                    </div>
                    <div className="text-[10px] text-white/80 truncate max-w-[130px]">
                      {user.organization}
                    </div>
                  </div>
                </div>

                {/* Sign Out Button */}
                <button
                  onClick={logout}
                  className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-black/25 transition-all cursor-pointer ml-1"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
