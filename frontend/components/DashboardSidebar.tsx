'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  Settings,
  LucideIcon,
  Bell,
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  onClick?: () => void;
}

interface NavSection {
  group: string;
  items: NavItem[];
}

interface SidebarProps<T extends string = string> {
  activeTab: T;
  setActiveTab: (tab: T) => void;
  pendingCount?: number;
  unreadNotificationsCount?: number;
}

export default function DashboardSidebar<T extends string = string>({
  activeTab,
  setActiveTab,
  pendingCount = 0,
  unreadNotificationsCount = 0,
}: SidebarProps<T>) {
  const { role, user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const getNavSections = (): NavSection[] => {
    if (role === 'ADMIN') {
      return [
        {
          group: 'Operations',
          items: [
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'verifications', label: 'Approvals', icon: FileCheck2, badge: pendingCount },
            { id: 'donors', label: 'Users', icon: Users },
            { id: 'inventory', label: 'Blood Matrix', icon: Database },
          ],
        },
        {
          group: 'Communications',
          items: [
            { id: 'messages', label: 'Messages', icon: MessageSquare },
            { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotificationsCount },
          ],
        },
        {
          group: 'System',
          items: [
            { id: 'audit', label: 'Audit Logs', icon: History },
            { id: 'settings', label: 'Settings', icon: Settings },
          ],
        },
      ];
    }
    if (role === 'HOSPITAL') {
      return [
        {
          group: 'Operations',
          items: [
            { id: 'requisitions', label: 'Requisitions', icon: LayoutDashboard },
            { id: 'donors', label: 'Donor Finder', icon: Users },
          ],
        },
        {
          group: 'Communications',
          items: [
            { id: 'messages', label: 'Messages', icon: MessageSquare },
            { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotificationsCount },
            { id: 'staff', label: 'Staff', icon: UserCheck },
          ],
        },
        {
          group: 'Facility',
          items: [{ id: 'info', label: 'Profile', icon: Building2 }],
        },
      ];
    }
    return [
      {
        group: 'Operations',
        items: [
          { id: 'inventory', label: 'Inventory', icon: Database },
          { id: 'walkin', label: 'Walk-In Intake', icon: UserCheck },
          { id: 'drives', label: 'Donation Drives', icon: Calendar },
        ],
      },
      {
        group: 'Communications',
        items: [
          { id: 'messages', label: 'Messages', icon: MessageSquare },
          { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotificationsCount },
          { id: 'staff', label: 'Staff', icon: Users },
        ],
      },
      {
        group: 'System',
        items: [
          { id: 'audit', label: 'Audit Trail', icon: Layers },
          { id: 'info', label: 'Profile', icon: Building2 },
        ],
      },
    ];
  };

  const navSections = getNavSections();
  const initial = user.avatarLetter || user.name.charAt(0);

  return (
    <aside
      aria-label="Dashboard navigation"
      className={`relative z-30 flex h-screen shrink-0 flex-col justify-between overflow-hidden border-r border-[#1E293B] bg-[#0B1528] text-slate-300 transition-[width] duration-300 ease-out ${
        isCollapsed ? 'w-[76px]' : 'w-64 sm:w-72'
      }`}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Brand */}
        <div
          className={`flex h-16 shrink-0 items-center border-b border-[#1E293B] ${
            isCollapsed ? 'justify-center px-2' : 'justify-between px-4 sm:px-5'
          }`}
        >
          {!isCollapsed && (
            <Link
              href="/"
              className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#EF5350]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-0.5 shadow-sm">
                <Image
                  src="/ic_app_logo_round.png"
                  alt="BloodLink logo"
                  width={34}
                  height={34}
                  priority
                  className="object-cover"
                />
              </div>
              <span className="text-lg font-black tracking-tight text-white">
                Blood<span className="text-[#EF5350]">Link</span>
              </span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed((v) => !v)}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isCollapsed}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="cursor-pointer rounded-lg p-2 text-slate-400 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-[#EF5350]"
          >
            {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4 [scrollbar-width:thin] [scrollbar-color:#1E293B_transparent]">
          {navSections.map((section) => (
            <div key={section.group} className="space-y-1">
              {isCollapsed ? (
                <div aria-hidden className="mx-3 mb-2 h-px bg-[#1E293B]" />
              ) : (
                <div className="px-3.5 pb-1 text-xs font-semibold text-slate-500">{section.group}</div>
              )}

              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const hasBadge = item.badge !== undefined && item.badge > 0;

                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    title={isCollapsed ? item.label : undefined}
                    onClick={() => (item.onClick ? item.onClick() : setActiveTab(item.id as T))}
                    className={`group relative flex w-full cursor-pointer items-center rounded-xl text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#EF5350] ${
                      isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3.5 py-2.5'
                    } ${
                      isActive
                        ? 'bg-[#C62828] font-bold text-white shadow-md shadow-[#C62828]/25'
                        : 'font-medium text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}
                      aria-hidden
                    />
                    {!isCollapsed && <span className="flex-1 truncate text-left">{item.label}</span>}

                    {hasBadge &&
                      (isCollapsed ? (
                        <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-[#EF5350] ring-2 ring-[#0B1528]" />
                      ) : (
                        <span
                          className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums ${
                            isActive ? 'bg-white text-[#C62828]' : 'bg-[#EF5350] text-white'
                          }`}
                        >
                          {item.badge! > 99 ? '99+' : item.badge}
                        </span>
                      ))}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Account */}
      <div className="shrink-0 border-t border-[#1E293B] bg-[#070E1B] p-3">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-black text-white ring-1 ring-white/15">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-white">{user.name}</div>
              <div className="truncate text-[11px] text-slate-400">{user.badge || 'Portal access'}</div>
            </div>
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              aria-label="Sign out"
              title="Sign out"
              className="cursor-pointer rounded-lg p-2 text-slate-400 outline-none transition-colors hover:bg-rose-500/10 hover:text-rose-400 focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              title={user.name}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-black text-white ring-1 ring-white/15"
            >
              {initial}
            </div>
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              aria-label="Sign out"
              title="Sign out"
              className="cursor-pointer rounded-lg p-2 text-slate-400 outline-none transition-colors hover:bg-rose-500/10 hover:text-rose-400 focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
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
    </aside>
  );
}
