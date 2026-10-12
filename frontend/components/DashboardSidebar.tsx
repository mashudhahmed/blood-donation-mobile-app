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
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Settings,
  LucideIcon,
} from 'lucide-react';

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
  onOpenMessages?: () => void;
}

export default function DashboardSidebar<T extends string = string>({
  activeTab,
  setActiveTab,
  pendingCount = 0,
  onOpenMessages,
}: SidebarProps<T>) {
  const { role, user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Grouped Navigation structure matching reference screenshots
  const getNavSections = (): NavSection[] => {
    if (role === 'ADMIN') {
      return [
        {
          group: 'HOSPITAL OPERATIONS',
          items: [
            { id: 'overview', label: 'Executive Analytics', icon: LayoutDashboard },
            { id: 'verifications', label: 'Doctor & Facility Approvals', icon: FileCheck2, badge: pendingCount },
          ],
        },
        {
          group: 'USER & STAFF DIRECTORY',
          items: [
            { id: 'donors', label: 'Users & Donor Directory', icon: Users },
            { id: 'inventory', label: 'National Blood Matrix', icon: Database },
            { id: 'messages', label: 'Direct Donor Messages', icon: MessageSquare, onClick: onOpenMessages },
          ],
        },
        {
          group: 'SYSTEM & SECURITY',
          items: [
            { id: 'audit', label: 'Security & Audit Logs', icon: History },
            { id: 'settings', label: 'System Settings', icon: Settings },
          ],
        },
      ];
    } else if (role === 'HOSPITAL') {
      return [
        {
          group: 'EMERGENCY OPERATIONS',
          items: [
            { id: 'requisitions', label: 'Requisition Pipeline', icon: LayoutDashboard },
            { id: 'donors', label: 'Compatible Donor Finder', icon: Users },
          ],
        },
        {
          group: 'CLINICAL & COMMUNICATION',
          items: [
            { id: 'messages', label: 'Direct Donor Messages', icon: MessageSquare, onClick: onOpenMessages },
            { id: 'staff', label: 'Staff & Positions', icon: UserCheck },
          ],
        },
        {
          group: 'FACILITY & CREDENTIALS',
          items: [
            { id: 'info', label: 'Facility Profile & License', icon: Building2 },
          ],
        },
      ];
    } else {
      return [
        {
          group: 'CRYO-STORAGE OPERATIONS',
          items: [
            { id: 'inventory', label: 'Cryo-Inventory Matrix', icon: Database },
            { id: 'walkin', label: 'Walk-In Donor Intake', icon: UserCheck },
            { id: 'drives', label: 'Blood Donation Drives', icon: Calendar },
          ],
        },
        {
          group: 'LAB & COMMUNICATION',
          items: [
            { id: 'messages', label: 'Direct Donor Messages', icon: MessageSquare, onClick: onOpenMessages },
            { id: 'staff', label: 'Staff & Technicians', icon: Users },
          ],
        },
        {
          group: 'SECURITY & AUDIT',
          items: [
            { id: 'audit', label: 'Movement Audit Trail', icon: Layers },
            { id: 'info', label: 'Facility Credentials', icon: Building2 },
          ],
        },
      ];
    }
  };

  const navSections = getNavSections();

  return (
    <aside
      className={`relative bg-[#0B1528] text-slate-300 border-r border-[#1E293B] flex flex-col justify-between transition-all duration-300 z-30 shrink-0 h-screen overflow-hidden ${
        isCollapsed ? 'w-20' : 'w-64 sm:w-72'
      }`}
    >
      {/* Top Sidebar Header: Brand Logo matching Screenshot reference */}
      <div>
        <div className="h-16 border-b border-[#1E293B] px-4 sm:px-5 flex items-center justify-between">
          {!isCollapsed ? (
            <Link href="/" className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-white p-0.5 shadow-sm overflow-hidden shrink-0 flex items-center justify-center">
                <Image
                  src="/ic_app_logo_round.png"
                  alt="BloodLink Logo"
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
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-8 h-8 rounded-xl bg-white p-0.5 shadow-sm overflow-hidden flex items-center justify-center">
                <Image
                  src="/ic_app_logo_round.png"
                  alt="BloodLink Logo"
                  width={30}
                  height={30}
                  priority
                  className="object-cover"
                />
              </div>
            </div>
          )}

          {/* Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Grouped Navigation Stream */}
        <div className="px-3 py-3 overflow-y-auto max-h-[calc(100vh-10rem)] space-y-4">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {section.group}
                </div>
              )}

              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.onClick) {
                        item.onClick();
                      } else {
                        setActiveTab(item.id as T);
                      }
                    }}
                    className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#C62828] text-white font-bold shadow-md shadow-[#C62828]/25'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {!isCollapsed && (
                      <span className="truncate flex-1 text-left">{item.label}</span>
                    )}

                    {!isCollapsed && 'badge' in item && item.badge !== undefined && item.badge > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EF5350] text-white">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Profile & Sign Out Bar matching Screenshots 1 & 2 */}
      <div className="p-3 border-t border-[#1E293B] bg-[#070E1B]">
        {!isCollapsed ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-2.5 px-2 py-1">
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-black flex items-center justify-center text-xs ring-1 ring-white/20 shrink-0">
                {user.avatarLetter || user.name.charAt(0)}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate">{user.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{user.badge || 'Portal Access'}</div>
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2 py-1">
            <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-black flex items-center justify-center text-xs">
              {user.avatarLetter || user.name.charAt(0)}
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
