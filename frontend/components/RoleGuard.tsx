'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth, UserRole } from '@/lib/auth-context';
import { ShieldAlert, ArrowRight, Lock, LogIn, LogOut } from 'lucide-react';

interface RoleGuardProps {
  allowedRole: UserRole;
  children: React.ReactNode;
}

const ROLE_DASHBOARDS: Record<UserRole, { path: string; name: string }> = {
  ADMIN: { path: '/admin', name: 'Admin Dashboard' },
  HOSPITAL: { path: '/hospital', name: 'Hospital Dashboard' },
  BLOOD_BANK: { path: '/bloodbank', name: 'Blood Bank Dashboard' },
};

export default function RoleGuard({ allowedRole, children }: RoleGuardProps) {
  const { role, user, isAuthenticated, logout } = useAuth();

  // If unauthenticated, prompt to sign in
  if (!isAuthenticated) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full text-center shadow-xl space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
            <Lock className="w-8 h-8 text-app-primary" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Sign In Required</h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Please sign in with an authorized account to access the <strong>{allowedRole}</strong> portal.
            </p>
          </div>
          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-app-primary hover:bg-app-primaryDark text-white font-bold text-xs shadow-md shadow-app-primary/20 transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </Link>
        </div>
      </div>
    );
  }

  // If role mismatch, show strict 403 Forbidden RBAC screen
  if (role !== allowedRole) {
    const userDashboard = ROLE_DASHBOARDS[role];

    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-lg w-full text-center shadow-xl space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-amber-600" />
          </div>

          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 mb-2">
              <span>Access Restricted</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900">Permission Denied</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Your current account (<strong>{user.name}</strong>, {role}) does not have permission to view this section.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={userDashboard.path}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
            >
              <span>Return to {userDashboard.name}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={logout}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 py-2.5 px-5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
