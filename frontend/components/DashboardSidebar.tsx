'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  FileCheck2,
  Database,
  Users,
  History,
  Building2,
  Calendar,
  UserCheck,
  Layers,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps<T extends string = string> {
  activeTab: T;
  setActiveTab: (tab: T) => void;
  pendingCount?: number;
}

export default function DashboardSidebar<T extends string = string>({
  activeTab,
  setActiveTab,
  pendingCount = 0,
}: SidebarProps<T>) {
  const { role, user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Define sidebar navigation items based on current role
  const getNavItems = () => {
    if (role === 'ADMIN') {
      return [
        { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard },
        { id: 'verifications', label: 'Approvals Queue', icon: FileCheck2, badge: pendingCount },
        { id: 'inventory', label: 'National Blood Matrix', icon: Database },
        { id: 'donors', label: 'Donor Directory', icon: Users },
        { id: 'audit', label: 'Security & Audit Stream', icon: History },
      ];
    } else if (role === 'HOSPITAL') {
      return [
        { id: 'requisitions', label: 'Requisition Pipeline', icon: LayoutDashboard },
        { id: 'donors', label: 'Compatible Donor Finder', icon: Users },
        { id: 'staff', label: 'Staff & Positions', icon: UserCheck },
        { id: 'info', label: 'Facility Profile', icon: Building2 },
      ];
    } else {
      return [
        { id: 'inventory', label: 'Cryo-Inventory Matrix', icon: Database },
        { id: 'walkin', label: 'Walk-In Donor Intake', icon: UserCheck },
        { id: 'drives', label: 'Blood Donation Drives', icon: Calendar },
        { id: 'staff', label: 'Staff & Positions', icon: Users },
        { id: 'audit', label: 'Movement Audit Trail', icon: Layers },
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <aside
      className={`relative bg-white border-r border-[#E2E8F0] flex flex-col justify-between transition-all duration-300 z-30 shrink-0 ${
        isCollapsed ? 'w-20' : 'w-64 sm:w-72'
      }`}
    >
      {/* Top Sidebar Header */}
      <div>
        <div className="h-14 border-b border-[#E2E8F0] px-4 flex items-center justify-between">
          {!isCollapsed ? (
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Workspace Navigation
              </span>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <span className="w-2 h-2 rounded-full bg-slate-300" />
            </div>
          )}

          {/* Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Current Facility Mini Card */}
        {!isCollapsed && (
          <div className="p-3.5 mx-3 my-3 rounded-2xl bg-[#F5F5F5] border border-[#E2E8F0]">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
                {role.charAt(0)}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-900 truncate">{user.organization}</div>
                <div className="text-[10px] text-slate-400 truncate">{user.badge}</div>
              </div>
            </div>

            {/* Approval Status Pill */}
            <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Clearance:</span>
              {role === 'ADMIN' ? (
                <span className="inline-flex items-center font-bold text-slate-900 text-[10px]">
                  <ShieldCheck className="w-3 h-3 text-slate-800 mr-1" />
                  Super Admin
                </span>
              ) : (
                <span className="inline-flex items-center font-bold text-emerald-700 text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 mr-1" />
                  Authorized Facility
                </span>
              )}
            </div>
          </div>
        )}

        {/* Navigation Section */}
        <div className="px-3 py-2 space-y-1">
          {!isCollapsed && (
            <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Views & Tools
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as T)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs transition-all relative text-left ${
                  isActive
                    ? 'bg-[#FFEBEE] text-[#C62828] border-l-4 border-[#C62828] font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#C62828]' : 'text-slate-400'}`} />
                {!isCollapsed && <span className="truncate flex-1">{item.label}</span>}
                {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-[#C62828] text-white' : 'bg-red-100 text-[#C62828]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-app-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer / User Profile & Role Switcher */}
      <div className="p-3 border-t border-[#E2E8F0] space-y-2">
        {/* Session Security Indicator */}
        {!isCollapsed && (
          <div className="bg-[#F5F5F5] rounded-xl p-2.5 border border-[#E2E8F0] text-xs">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
              <span>RBAC Session</span>
              <span className="text-emerald-700 font-extrabold flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1 animate-pulse" />
                Active
              </span>
            </div>
            <div className="text-[11px] font-extrabold text-slate-900 truncate">
              {role === 'ADMIN' ? 'Super Administrator' : role === 'HOSPITAL' ? 'Hospital Medical Staff' : 'Blood Bank Officer'}
            </div>
          </div>
        )}

        {/* User Card */}
        <div
          className={`flex items-center rounded-xl p-2 bg-[#F5F5F5] border border-[#E2E8F0] ${
            isCollapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <div className="flex items-center space-x-2.5 truncate">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0 ring-2 ring-white">
              {user.avatarLetter || user.name.charAt(0)}
            </div>
            {!isCollapsed && (
              <div className="truncate text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight truncate">
                  {user.name.split(',')[0]}
                </div>
                <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
