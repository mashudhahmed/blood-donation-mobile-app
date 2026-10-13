'use client';

import React, { useState, useEffect, useCallback } from 'react';
import RoleGuard from '@/components/RoleGuard';
import DashboardSidebar from '@/components/DashboardSidebar';
import TopHeader from '@/components/TopHeader';
import BloodGroupBadge from '@/components/BloodGroupBadge';
import StatusPill from '@/components/StatusPill';
import ConfirmModal from '@/components/ConfirmModal';
import { useAuth } from '@/lib/auth-context';
import {
  ShieldCheck,
  Users,
  CheckCircle2,
  Search,
  Phone,
  Clock,
  RefreshCw,
  Shield,
  Check,
  X,
  Eye,
  Mail,
  Zap,
  ArrowRight,
  FileCheck2,
  MessageSquare,
  Send,
  Bell,
  MapPin,
  CheckCheck,
  Building2,
} from 'lucide-react';
import {
  api,
  Donor,
  SystemAuditLog,
  Conversation,
  ChatMessage,
  Organization,
  Requisition,
  AdminMetrics,
} from '@/lib/api';

export type AdminTab =
  | 'overview'
  | 'verifications'
  | 'donors'
  | 'inventory'
  | 'messages'
  | 'notifications'
  | 'audit'
  | 'settings';

interface AdminNotification {
  id: string;
  type: 'EMERGENCY' | 'APPROVAL' | 'SYSTEM' | 'SUCCESS';
  title: string;
  description: string;
  targetInfo?: string;
  timestamp: string;
  isRead: boolean;
  actionLabel?: string;
  actionTab?: AdminTab;
}

export default function AdminPortal() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalUsers: 0,
    totalDonors: 0,
    availableDonors: 0,
    totalRequests: 0,
    activeRequests: 0,
    fulfilledRequests: 0,
    totalHospitals: 0,
    totalBloodBanks: 0,
    donorBloodDistribution: { 'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'O+': 0, 'O-': 0, 'AB+': 0, 'AB-': 0 },
    bloodGroupDemand: { 'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'O+': 0, 'O-': 0, 'AB+': 0, 'AB-': 0 },
  });
  const [hospitals, setHospitals] = useState<Organization[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [inventory, setInventory] = useState<Record<string, { units: number; status: 'CRITICAL' | 'LOW' | 'NORMAL' | 'ABUNDANT' }>>({});
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // In-Page Messages State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string>('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');

  // In-Page Notifications State (Populated dynamically from real database records)
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread' | 'EMERGENCY' | 'APPROVAL' | 'SYSTEM'>('all');

  // Modals & Inspect
  const [selectedAuditLog, setSelectedAuditLog] = useState<SystemAuditLog | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<Donor | null>(null);
  const [verifyConfirm, setVerifyConfirm] = useState<{ id: string; name: string; currentVerified: boolean } | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditResourceFilter, setAuditResourceFilter] = useState('all');

  const loadData = useCallback(async () => {
    try {
      const [mRes, orgRes, dRes, invRes, aRes, reqRes, convRes] = await Promise.allSettled([
        api.getAdminMetrics(),
        api.getOrganizations('hospital'),
        api.getAdminDonors(),
        api.getInventory(),
        api.getSystemAuditLogs(),
        api.getHospitalRequisitions(),
        api.getConversations(),
      ]);

      if (mRes.status === 'fulfilled' && mRes.value?.metrics) {
        setMetrics((prev) => ({ ...prev, ...mRes.value.metrics }));
      }
      if (orgRes.status === 'fulfilled' && orgRes.value?.organizations) {
        setHospitals(orgRes.value.organizations);
      }
      if (dRes.status === 'fulfilled' && dRes.value?.donors) {
        setDonors(dRes.value.donors);
      }
      if (invRes.status === 'fulfilled' && invRes.value?.inventory) {
        setInventory(invRes.value.inventory);
      }
      if (aRes.status === 'fulfilled' && aRes.value?.logs) {
        setAuditLogs(aRes.value.logs);
      }
      if (reqRes.status === 'fulfilled' && reqRes.value?.requisitions) {
        setRequisitions(reqRes.value.requisitions);
      }
      if (convRes.status === 'fulfilled' && convRes.value?.conversations) {
        setConversations(convRes.value.conversations);
        if (convRes.value.conversations.length > 0) {
          setSelectedConvId((prev) => prev || convRes.value.conversations[0].id);
        }
      }

      // Generate dynamic real notifications from verified Firestore entities
      const realNotifs: AdminNotification[] = [];

      const orgList = orgRes.status === 'fulfilled' && orgRes.value?.organizations ? orgRes.value.organizations : [];
      orgList.filter((o) => !o.verified).forEach((org) => {
        realNotifs.push({
          id: `org-review-${org.id}`,
          type: 'APPROVAL',
          title: `Accreditation Review: ${org.name}`,
          description: `${org.name} (${org.district || 'Bangladesh'}) submitted facility registration${org.licenseNumber ? ` with license ${org.licenseNumber}` : ''}.`,
          targetInfo: 'Pending Administrator Verification clearance.',
          timestamp: 'Review Needed',
          isRead: false,
          actionLabel: 'Review License',
          actionTab: 'verifications',
        });
      });

      const reqList = reqRes.status === 'fulfilled' && reqRes.value?.requisitions ? reqRes.value.requisitions : [];
      reqList
        .filter((r) => r.status !== 'fulfilled' && r.status !== 'cancelled')
        .slice(0, 5)
        .forEach((req) => {
          const isCritical = String(req.urgency || '').toLowerCase() === 'critical';
          realNotifs.push({
            id: `req-alert-${req.id}`,
            type: isCritical ? 'EMERGENCY' : 'APPROVAL',
            title: `${isCritical ? 'Critical' : 'Active'} ${req.bloodGroup} Blood Requisition`,
            description: `${req.hospitalName || req.hospital || 'Facility'} requires ${req.units || 1} units for patient ${req.patientName || 'Emergency Patient'}.`,
            targetInfo: `Priority: ${String(req.urgency || 'NORMAL').toUpperCase()} | District: ${req.district || 'Central'}`,
            timestamp: 'Active Pipeline',
            isRead: false,
            actionLabel: 'Inspect Pipeline',
            actionTab: 'inventory',
          });
        });

      reqList
        .filter((r) => r.status === 'fulfilled')
        .slice(0, 3)
        .forEach((req) => {
          realNotifs.push({
            id: `req-done-${req.id}`,
            type: 'SUCCESS',
            title: `Requisition Fulfilled: ${req.bloodGroup}`,
            description: `Patient ${req.patientName || 'Medical Case'} fulfilled successfully.`,
            targetInfo: `Facility: ${req.hospitalName || 'Hospital'} | Registry Updated`,
            timestamp: 'Fulfilled',
            isRead: true,
            actionLabel: 'View Direct Chat',
            actionTab: 'messages',
          });
        });

      const auditList = aRes.status === 'fulfilled' && aRes.value?.logs ? aRes.value.logs : [];
      if (auditList.length > 0) {
        const latest = auditList[0];
        realNotifs.push({
          id: `audit-${latest.id}`,
          type: 'SYSTEM',
          title: `Security Log: ${latest.action}`,
          description: latest.details || `Administrative event recorded by ${latest.user || 'System'}.`,
          targetInfo: `IP: ${latest.ipAddress || 'Authorized Terminal'} | Status: ${latest.status || 'Verified'}`,
          timestamp: latest.timestamp || 'Recent',
          isRead: true,
          actionLabel: 'Inspect Audit Logs',
          actionTab: 'audit',
        });
      }

      setNotifications(realNotifs);
    } catch (err) {
      console.warn('Admin fetch error', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleVerify = async (id: string, currentVerified: boolean) => {
    const updatedStatus = !currentVerified;
    setHospitals((prev) =>
      prev.map((h) => (h.id === id ? { ...h, verified: updatedStatus } : h))
    );

    try {
      await api.verifyOrganization(id, 'hospital', updatedStatus);
      setFeedbackMsg(`Facility license ${updatedStatus ? 'approved & cleared for broadcasts' : 'revoked'} successfully.`);
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch {
      setFeedbackMsg('Failed to update facility status in Firestore');
    }
  };

  const pendingCount = hospitals.filter((h) => !h.verified).length;
  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

  // Filtered Donors / Users
  const filteredDonors = donors.filter((d) => {
    const donorName = d?.name || '';
    const donorDistrict = d?.district || d?.location || '';
    const donorPhone = d?.phone || '';
    const matchesSearch =
      donorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      donorDistrict.toLowerCase().includes(searchQuery.toLowerCase()) ||
      donorPhone.includes(searchQuery);
    const matchesRole =
      selectedRoleFilter === 'all' ||
      (selectedRoleFilter === 'eligible' && d?.canDonate) ||
      (selectedRoleFilter === 'cooldown' && !d?.canDonate) ||
      d?.bloodGroup === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    const userStr = log?.user || '';
    const resourceId = log?.resourceId || '';
    const ipAddress = log?.ipAddress || '';
    const details = log?.details || '';
    const matchesQuery =
      userStr.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
      resourceId.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
      ipAddress.includes(auditSearchQuery) ||
      details.toLowerCase().includes(auditSearchQuery.toLowerCase());
    const matchesAction = auditActionFilter === 'all' || log?.action === auditActionFilter;
    const matchesResource = auditResourceFilter === 'all' || log?.resource === auditResourceFilter;
    return matchesQuery && matchesAction && matchesResource;
  });

  // In-Page Send Message Handler
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      text: messageInput.trim(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      isMe: true,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConvId
          ? {
              ...c,
              lastMessage: newMsg.text,
              lastMessageTime: newMsg.timestamp,
              messages: [...c.messages, newMsg],
            }
          : c
      )
    );

    api.sendMessage(selectedConvId, newMsg.text);
    setMessageInput('');
  };

  const currentConv = conversations.find((c) => c.id === selectedConvId) || conversations[0] || null;
  const filteredConversations = conversations.filter((c) => {
    const q = chatSearchQuery.toLowerCase();
    const pName = (c?.participantName || '').toLowerCase();
    const pBlood = (c?.participantBloodGroup || '').toLowerCase();
    const pDistrict = (c?.participantDistrict || '').toLowerCase();
    const pLast = (c?.lastMessage || '').toLowerCase();
    return pName.includes(q) || pBlood.includes(q) || pDistrict.includes(q) || pLast.includes(q);
  });

  // Filtered Notifications
  const filteredNotifications = notifications.filter((n) => {
    if (notificationFilter === 'all') return true;
    if (notificationFilter === 'unread') return !n.isRead;
    return n.type === notificationFilter;
  });

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setFeedbackMsg('All notifications marked as read.');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  return (
    <RoleGuard allowedRole="ADMIN">
      <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
        {/* Full-Height Dark Navy Left Sidebar with Simpler Tab Names */}
        <DashboardSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingCount={pendingCount}
          unreadNotificationsCount={unreadNotificationsCount}
        />

        {/* Right Main Column */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Header App Bar with Notifications & Messages triggers */}
          <TopHeader
            onOpenMessages={() => setActiveTab('messages')}
            onOpenNotifications={() => setActiveTab('notifications')}
          />

          {/* Feedback Banner */}
          {feedbackMsg && (
            <div className="bg-emerald-600 text-white text-xs font-bold px-6 py-2.5 flex items-center justify-between shadow-sm animate-in fade-in shrink-0">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>{feedbackMsg}</span>
              </div>
              <button onClick={() => setFeedbackMsg(null)} className="text-emerald-200 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Scrollable Workspace Content */}
          <main className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
            {/* ============================================================== */}
            {/* VIEW 1: OVERVIEW (Screenshot 2 Reference)                       */}
            {/* ============================================================== */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Greeting Hero Card matching Screenshot 2 */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="inline-flex items-center space-x-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Admin Portal</span>
                      </span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="text-xs text-slate-500 font-medium">Monday, Oct 12, 2026</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                      Good afternoon, System Administrator
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                      Monitor national telemetry, practitioner and facility license approvals, 8-group cryo-matrix inventory, and hospital compliance audit logs.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      onClick={() => setActiveTab('donors')}
                      className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                    >
                      <Users className="w-4 h-4 text-slate-300" />
                      <span>Users Directory</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('verifications')}
                      className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#C62828] hover:bg-[#B71C1C] text-white font-bold text-xs shadow-md shadow-[#C62828]/20 transition-all cursor-pointer"
                    >
                      <FileCheck2 className="w-4 h-4 text-white" />
                      <span>Approvals ({pendingCount})</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('messages')}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all cursor-pointer"
                      title="Direct Donor Messaging"
                    >
                      <MessageSquare className="w-4 h-4 text-[#C62828]" />
                      <span>Messages</span>
                    </button>
                  </div>
                </div>

                {/* 4 Stats Cards matching Screenshot 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                        TOTAL USERS
                      </span>
                      <div className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                        {metrics.totalDonors.toLocaleString()}
                      </div>
                      <span className="text-xs text-slate-500 font-medium mt-0.5 block">
                        Registered citizen donors
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                        HEALTHCARE FACILITIES
                      </span>
                      <div className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                        {hospitals.length}
                      </div>
                      <span className="text-xs text-slate-500 font-medium mt-0.5 block">
                        Hospitals & blood centers
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
                      <Building2 className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                        ACTIVE BROADCASTS
                      </span>
                      <div className="text-2xl font-black text-[#C62828] mt-1 tracking-tight">
                        {metrics.activeRequests || metrics.activeUrgentRequests || 0}
                      </div>
                      <span className="text-xs text-slate-500 font-medium mt-0.5 block">
                        Emergency FCM dispatches
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#FFEBEE] border border-[#FFCDD2] flex items-center justify-center text-[#C62828] shadow-2xs">
                      <Zap className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                        PENDING CLEARANCE
                      </span>
                      <div className="text-2xl font-black text-amber-600 mt-1 tracking-tight">
                        {pendingCount}
                      </div>
                      <span className="text-xs text-slate-500 font-medium mt-0.5 block">
                        Licensing verification queue
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
                      <FileCheck2 className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Live Urgent Requisitions Section */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                        Live Hospital Emergency Requisitions
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Real-time clinical dispatches notified to nearby mobile app donors via Firebase Cloud Messaging
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('donors')}
                      className="text-xs font-bold text-[#C62828] hover:text-[#B71C1C] flex items-center space-x-1 cursor-pointer"
                    >
                      <span>View Donors</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {requisitions.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-xs font-bold text-slate-600">No active emergency requisitions in the network</p>
                      <p className="text-[11px] text-slate-400 mt-1">Clinical requests submitted by hospitals or mobile users will display here in real-time.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {requisitions.slice(0, 3).map((req) => (
                        <div
                          key={req.id}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2.5">
                              <BloodGroupBadge bloodGroup={req.bloodGroup} size="sm" />
                              <div>
                                <h4 className="font-extrabold text-slate-900 text-xs">Patient: {req.patientName}</h4>
                                <span className="text-[11px] text-slate-500">{req.hospitalName || req.hospital || 'Dhaka Medical College'}</span>
                              </div>
                            </div>
                            <StatusPill status={req.urgency} />
                          </div>
                          <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/80">
                            <strong>Note:</strong> {req.notes || req.medicalReason || 'Emergency clinical requisition'}
                          </div>
                          <div className="flex items-center justify-between text-[11px] pt-1">
                            <span className="text-slate-500">{req.district || 'Dhaka'}, Bangladesh</span>
                            <StatusPill status={req.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* VIEW 2: APPROVALS (Facility Verifications Queue)               */}
            {/* ============================================================== */}
            {activeTab === 'verifications' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-lg font-black text-slate-900 tracking-tight">
                          Doctor & Healthcare Facility Approvals
                        </h2>
                        <span className="text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full">
                          {pendingCount} Pending Review
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Inspect institutional credentials, DGHS hospital permits, and blood bank licenses before clearing emergency broadcasting permissions.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="px-6 py-3.5">INSTITUTION</th>
                          <th className="px-6 py-3.5">LICENSE / REG NO.</th>
                          <th className="px-6 py-3.5">DISTRICT</th>
                          <th className="px-6 py-3.5">HOTLINE</th>
                          <th className="px-6 py-3.5">CLEARANCE STATUS</th>
                          <th className="px-6 py-3.5 text-right">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {hospitals.map((h) => (
                          <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-extrabold text-slate-900">{h.name}</div>
                              <span className="text-[11px] text-slate-400">Hospital / Trauma Center</span>
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-slate-800">{h.licenseNumber}</td>
                            <td className="px-6 py-4 font-semibold text-slate-600">{h.district}</td>
                            <td className="px-6 py-4 font-mono text-slate-700">{h.contactPhone}</td>
                            <td className="px-6 py-4">
                              {h.verified ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                  DGHS Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                                  Awaiting Approval
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() =>
                                  setVerifyConfirm({
                                    id: h.id,
                                    name: h.name,
                                    currentVerified: h.verified,
                                  })
                                }
                                className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                  h.verified
                                    ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                                    : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-sm'
                                }`}
                              >
                                {h.verified ? 'Revoke Access' : 'Approve Facility'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* VIEW 3: USERS (Screenshot 4 Reference)                          */}
            {/* ============================================================== */}
            {activeTab === 'donors' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">Users Directory</h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Manage user accounts, inspect clinical profiles, verify credentials, and regulate platform access.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-center shadow-xs">
                      <span className="block text-[10px] font-extrabold uppercase text-slate-400">TOTAL</span>
                      <span className="font-black text-sm text-slate-900">{metrics.totalDonors || donors.length}</span>
                    </div>
                    <div className="px-3.5 py-1.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-center shadow-xs">
                      <span className="block text-[10px] font-extrabold uppercase text-blue-600">DONORS</span>
                      <span className="font-black text-sm text-blue-900">{donors.filter((d) => d.isAvailable !== false).length || metrics.availableDonors}</span>
                    </div>
                    <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-center shadow-xs">
                      <span className="block text-[10px] font-extrabold uppercase text-emerald-600">HOSPITALS</span>
                      <span className="font-black text-sm text-emerald-900">{hospitals.filter((o) => o.type === 'hospital').length || metrics.totalHospitals || 0}</span>
                    </div>
                    <div className="px-3.5 py-1.5 rounded-xl bg-purple-50/70 border border-purple-200/80 text-center shadow-xs">
                      <span className="block text-[10px] font-extrabold uppercase text-purple-600">BLOOD BANKS</span>
                      <span className="font-black text-sm text-purple-900">{hospitals.filter((o) => o.type === 'bloodbank').length || metrics.totalBloodBanks || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by full name, email, or phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C62828]"
                    />
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <select
                      value={selectedRoleFilter}
                      onChange={(e) => setSelectedRoleFilter(e.target.value)}
                      className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none"
                    >
                      <option value="all">All Roles & Groups</option>
                      <option value="eligible">Eligible Donors Only</option>
                      <option value="cooldown">In 90-Day Cooldown</option>
                      <option value="O-">O- Negative (Universal)</option>
                      <option value="O+">O+ Positive</option>
                      <option value="A+">A+ Positive</option>
                      <option value="B+">B+ Positive</option>
                    </select>

                    <button
                      onClick={loadData}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                      title="Refresh"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="px-6 py-3.5">USER DETAILS</th>
                          <th className="px-6 py-3.5">ROLE / GROUP</th>
                          <th className="px-6 py-3.5">STATUS</th>
                          <th className="px-6 py-3.5">CONTACT PHONE</th>
                          <th className="px-6 py-3.5">DISTRICT</th>
                          <th className="px-6 py-3.5 text-right">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredDonors.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                              <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                              <p className="font-semibold text-slate-600">No registered donors found</p>
                              <p className="text-[11px]">All citizen donor registrations from the BloodLink Mobile App will synchronize here in real time.</p>
                            </td>
                          </tr>
                        ) : (
                          filteredDonors.map((donor) => (
                          <tr key={donor.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-9 h-9 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs shrink-0">
                                  {(donor?.name || 'Donor').charAt(0)}
                                </div>
                                <div>
                                  <div className="font-extrabold text-slate-900">{donor?.name || 'Anonymous Donor'}</div>
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    {donor?.email || `donor.${donor.id.slice(0, 8)}@bloodlink.org`}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <BloodGroupBadge bloodGroup={donor?.bloodGroup || 'O+'} size="sm" />
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  Donor
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {donor?.canDonate ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <Check className="w-3 h-3 mr-1 text-emerald-600" />
                                  Approved
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  <Clock className="w-3 h-3 mr-1 text-slate-500" />
                                  90-Day Cooldown
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 font-mono font-medium text-slate-700">{donor?.phone || 'N/A'}</td>
                            <td className="px-6 py-4 font-medium text-slate-600">{donor?.district || donor?.location || 'Dhaka'}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="inline-flex items-center space-x-2">
                                <button
                                  onClick={() => setSelectedUserDetail(donor)}
                                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold transition-all cursor-pointer"
                                >
                                  Inspect
                                </button>
                                <button
                                  onClick={() => {
                                    const conv = conversations.find((c) => c.participantId === donor.id);
                                    if (conv) setSelectedConvId(conv.id);
                                    setActiveTab('messages');
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all cursor-pointer"
                                >
                                  Message
                                </button>
                              </div>
                            </td>
                          </tr>
                        )))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* VIEW 4: BLOOD MATRIX (National Cryo Matrix)                    */}
            {/* ============================================================== */}
            {activeTab === 'inventory' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">National Blood Bank Cryo-Matrix (8 Groups)</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Central inventory levels preserved across registered transfusion facilities in Bangladesh
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                      Total Network Stock: {Object.values(inventory).reduce((acc, curr) => acc + curr.units, 0)} Bags
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
                    {Object.entries(inventory).map(([bg, data]) => {
                      const isCritical = data.status === 'CRITICAL';
                      const isLow = data.status === 'LOW';
                      const maxCapacity = 50;
                      const percentage = Math.min(100, Math.round((data.units / maxCapacity) * 100));

                      return (
                        <div
                          key={bg}
                          className={`p-4.5 rounded-2xl border flex flex-col justify-between space-y-3.5 transition-all shadow-xs ${
                            isCritical
                              ? 'border-red-300 bg-red-50/40 ring-1 ring-red-400'
                              : isLow
                              ? 'border-amber-300 bg-amber-50/40'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <BloodGroupBadge bloodGroup={bg} size="lg" />
                            <StatusPill status={data.status} />
                          </div>

                          <div>
                            <div className="flex items-baseline space-x-1.5">
                              <span className="text-3xl font-black text-slate-900 tracking-tight">
                                {data.units}
                              </span>
                              <span className="text-xs text-slate-500 font-semibold">Units</span>
                            </div>

                            <div className="mt-2.5 w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${
                                  isCritical
                                    ? 'bg-red-600'
                                    : isLow
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-600'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-100">
                            <span>Network Quota: {percentage}%</span>
                            <span className="font-semibold text-slate-700">Storage 2°C-6°C</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* VIEW 5: MESSAGES (In-Page Right Space - NOT A MODAL!)          */}
            {/* ============================================================== */}
            {activeTab === 'messages' && (
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs h-[calc(100vh-10.5rem)] flex flex-col overflow-hidden">
                {/* Messages Top Bar */}
                <div className="px-6 py-3.5 bg-[#0B1528] text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-[#C62828] text-white flex items-center justify-center shadow-md">
                      <MessageSquare className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                        <span>Direct Donor Communications</span>
                        <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          Mobile App Synced
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-300">
                        Real-time live chat thread synchronized with registered citizen donors across Bangladesh
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {conversations.length} Active Donor Threads
                    </span>
                  </div>
                </div>

                {/* 2-Column Split Workspace */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Left Column: Conversation Directory */}
                  <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50 shrink-0">
                    <div className="p-3 border-b border-slate-200 bg-white">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search donor, district or group..."
                          value={chatSearchQuery}
                          onChange={(e) => setChatSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C62828]"
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                      {filteredConversations.map((c) => {
                        const isSelected = c.id === selectedConvId;
                        return (
                          <button
                            key={c.id}
                            onClick={() => setSelectedConvId(c.id)}
                            className={`w-full p-3.5 text-left flex items-start space-x-3 transition-colors cursor-pointer ${
                              isSelected ? 'bg-white border-l-4 border-[#C62828] shadow-xs' : 'hover:bg-slate-100/70'
                            }`}
                          >
                            <div className="relative shrink-0">
                              <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs">
                                {c.participantName.charAt(0)}
                              </div>
                              <span className="absolute -bottom-1 -right-1">
                                <BloodGroupBadge bloodGroup={c.participantBloodGroup} size="sm" />
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs font-bold text-slate-900 truncate">
                                  {c.participantName}
                                </span>
                                <span className="text-[10px] text-slate-400">{c.lastMessageTime}</span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate leading-snug">
                                {c.lastMessage}
                              </p>
                              <div className="flex items-center space-x-2 mt-1 text-[10px] text-slate-400">
                                <span className="flex items-center">
                                  <MapPin className="w-2.5 h-2.5 mr-0.5" />
                                  {c.participantDistrict}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Live Chat Thread */}
                  <div className="flex-1 flex flex-col bg-white">
                    {currentConv ? (
                      <>
                        {/* Chat Header */}
                        <div className="p-3.5 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 shrink-0">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs">
                              {currentConv.participantName.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm font-bold text-slate-900">{currentConv.participantName}</h4>
                                <BloodGroupBadge bloodGroup={currentConv.participantBloodGroup} size="sm" />
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  Verified Donor
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5">
                                <span>{currentConv.participantDistrict}, Bangladesh</span>
                                <span>&bull;</span>
                                <span className="font-mono">{currentConv.participantPhone}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <a
                              href={`tel:${currentConv.participantPhone}`}
                              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center space-x-1.5 transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5 text-[#C62828]" />
                              <span>Call Donor</span>
                            </a>
                          </div>
                        </div>

                        {/* Messages Body */}
                        <div className="flex-1 p-5 overflow-y-auto space-y-3.5 bg-[#F8FAFC]">
                          <div className="flex justify-center my-2">
                            <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full uppercase tracking-wider">
                              Encrypted Live Session &bull; Monday, Oct 12, 2026
                            </span>
                          </div>

                          {currentConv.messages.map((m) => (
                            <div
                              key={m.id}
                              className={`flex flex-col ${m.isMe ? 'items-end' : 'items-start'}`}
                            >
                              <div
                                className={`max-w-md px-4 py-2.5 rounded-2xl text-xs shadow-2xs ${
                                  m.isMe
                                    ? 'bg-[#C62828] text-white rounded-br-xs'
                                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                                }`}
                              >
                                <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                              </div>
                              <div className="flex items-center space-x-1 mt-1 text-[10px] text-slate-400 px-1">
                                <span>{m.timestamp}</span>
                                {m.isMe && <CheckCheck className="w-3 h-3 text-emerald-600" />}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Quick Suggestion Chips */}
                        <div className="px-5 py-2 bg-slate-50 border-t border-slate-100 flex items-center space-x-2 overflow-x-auto shrink-0">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Quick Prompts:</span>
                          {[
                            'Are you available to donate today?',
                            'Can you proceed to DMC Hospital OT-3?',
                            'Emergency cross-matching complete.',
                          ].map((prompt) => (
                            <button
                              key={prompt}
                              onClick={() => setMessageInput(prompt)}
                              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-[#C62828] hover:text-[#C62828] text-slate-600 text-[11px] font-medium transition-colors shrink-0 cursor-pointer"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>

                        {/* Input Bar */}
                        <form onSubmit={handleSendMessage} className="p-3.5 px-5 border-t border-slate-200 bg-white flex items-center space-x-3 shrink-0">
                          <input
                            type="text"
                            placeholder={`Type direct message to ${currentConv.participantName}...`}
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#C62828]/20 focus:border-[#C62828]"
                          />
                          <button
                            type="submit"
                            disabled={!messageInput.trim()}
                            className="px-5 py-2.5 rounded-xl bg-[#C62828] hover:bg-[#B71C1C] text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-[#C62828]/20 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Send</span>
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
                        <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-500 flex items-center justify-center mb-3">
                          <MessageSquare className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-700">No Conversation Selected</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm">
                          Select a donor thread on the left to review messages, or wait for citizen donors to send messages from the mobile app.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* VIEW 6: NOTIFICATIONS (In-Page Feed)                           */}
            {/* ============================================================== */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                {/* Header Card */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                        <Bell className="w-4.5 h-4.5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">System Notification Center</h2>
                        <span className="text-[11px] text-slate-500">
                          Real-time platform dispatches, mobile push delivery logs, facility verifications & audit alerts
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={markAllNotificationsAsRead}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Mark All as Read
                    </button>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center gap-2">
                  {([
                    { id: 'all', label: `ALL (${notifications.length})` },
                    { id: 'unread', label: `UNREAD (${unreadNotificationsCount})` },
                    { id: 'EMERGENCY', label: `EMERGENCY (${notifications.filter((n) => n.type === 'EMERGENCY').length})` },
                    { id: 'APPROVAL', label: `APPROVALS (${notifications.filter((n) => n.type === 'APPROVAL').length})` },
                    { id: 'SYSTEM', label: `SYSTEM (${notifications.filter((n) => n.type === 'SYSTEM' || n.type === 'SUCCESS').length})` },
                  ] as const).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setNotificationFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        notificationFilter === tab.id
                          ? 'bg-[#C62828] text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Notification Feed List */}
                <div className="space-y-3.5">
                  {filteredNotifications.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/90 shadow-xs">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                        <Bell className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">No Notifications</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        All systems are running smoothly. Any incoming facility verifications, emergency broadcasts, or alerts will appear here in real-time.
                      </p>
                    </div>
                  ) : (
                    filteredNotifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start justify-between gap-4 shadow-xs ${
                          !n.isRead
                            ? 'bg-white border-[#C62828]/40 ring-1 ring-[#C62828]/15'
                            : 'bg-white border-slate-200/90'
                        }`}
                      >
                      <div className="flex items-start space-x-3.5 flex-1">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-2xs ${
                            n.type === 'EMERGENCY'
                              ? 'bg-rose-50 border border-rose-200 text-[#C62828]'
                              : n.type === 'APPROVAL'
                              ? 'bg-blue-50 border border-blue-200 text-blue-600'
                              : n.type === 'SUCCESS'
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                              : 'bg-purple-50 border border-purple-200 text-purple-600'
                          }`}
                        >
                          {n.type === 'EMERGENCY' ? (
                            <Zap className="w-5 h-5 animate-pulse" />
                          ) : n.type === 'APPROVAL' ? (
                            <FileCheck2 className="w-5 h-5" />
                          ) : n.type === 'SUCCESS' ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Shield className="w-5 h-5" />
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                n.type === 'EMERGENCY'
                                  ? 'bg-[#FFEBEE] text-[#C62828]'
                                  : n.type === 'APPROVAL'
                                  ? 'bg-blue-50 text-blue-700'
                                  : n.type === 'SUCCESS'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-purple-50 text-purple-700'
                              }`}
                            >
                              {n.type}
                            </span>
                            <span className="text-xs text-slate-400">&bull;</span>
                            <span className="text-xs text-slate-400 font-medium">{n.timestamp}</span>
                            {!n.isRead && (
                              <span className="w-2 h-2 rounded-full bg-[#C62828] animate-pulse" />
                            )}
                          </div>

                          <h4 className="text-sm font-extrabold text-slate-900">{n.title}</h4>
                          <p className="text-xs text-slate-600 leading-relaxed">{n.description}</p>
                          {n.targetInfo && (
                            <div className="text-[11px] font-mono text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200/80 mt-1">
                              {n.targetInfo}
                            </div>
                          )}
                        </div>
                      </div>

                      {n.actionLabel && n.actionTab && (
                        <div className="shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => {
                              setNotifications((prev) =>
                                prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
                              );
                              if (n.actionTab) setActiveTab(n.actionTab);
                            }}
                            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
                          >
                            <span>{n.actionLabel}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* VIEW 7: AUDIT LOGS (Screenshot 1 Reference)                     */}
            {/* ============================================================== */}
            {activeTab === 'audit' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                        <Shield className="w-4 h-4 text-white" />
                      </div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">Security & Audit Logs</h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Cryptographically tracked administrative actions, status advancements, and inventory movements.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-700 bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl self-start sm:self-auto shadow-xs">
                    {filteredAuditLogs.length} Verified Entries
                  </span>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col md:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by user, IP address, resource ID, or details..."
                      value={auditSearchQuery}
                      onChange={(e) => setAuditSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C62828]"
                    />
                  </div>

                  <div className="flex items-center space-x-2 w-full md:w-auto">
                    <select
                      value={auditActionFilter}
                      onChange={(e) => setAuditActionFilter(e.target.value)}
                      className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none"
                    >
                      <option value="all">All Actions</option>
                      <option value="LOGIN">LOGIN</option>
                      <option value="LOGOUT">LOGOUT</option>
                      <option value="REQUISITION">REQUISITION</option>
                      <option value="INTAKE">INTAKE</option>
                      <option value="DISPATCH">DISPATCH</option>
                      <option value="APPROVAL">APPROVAL</option>
                    </select>

                    <select
                      value={auditResourceFilter}
                      onChange={(e) => setAuditResourceFilter(e.target.value)}
                      className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none"
                    >
                      <option value="all">All Resources</option>
                      <option value="User">User</option>
                      <option value="Requisition">Requisition</option>
                      <option value="BloodStock">BloodStock</option>
                      <option value="Facility">Facility</option>
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="px-6 py-3.5">TIMESTAMP</th>
                          <th className="px-6 py-3.5">USER</th>
                          <th className="px-6 py-3.5">ACTION</th>
                          <th className="px-6 py-3.5">RESOURCE</th>
                          <th className="px-6 py-3.5">RESOURCE ID</th>
                          <th className="px-6 py-3.5">IP ADDRESS</th>
                          <th className="px-6 py-3.5 text-right">DETAILS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAuditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4 font-mono text-slate-600 whitespace-nowrap">
                              {log.timestamp}
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <span className="font-extrabold text-slate-900 block">{log.user}</span>
                                <span className="text-[10px] text-slate-400 uppercase font-bold">{log.role}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                  log.action === 'LOGIN'
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : log.action === 'LOGOUT'
                                    ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                    : log.action === 'INTAKE'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : log.action === 'DISPATCH'
                                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                    : log.action === 'APPROVAL'
                                    ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {log.action}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-700">{log.resource}</td>
                            <td className="px-6 py-4 font-mono text-slate-500">{log.resourceId}</td>
                            <td className="px-6 py-4 font-mono text-slate-600">{log.ipAddress}</td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => setSelectedAuditLog(log)}
                                className="inline-flex items-center space-x-1 text-slate-700 hover:text-slate-900 font-bold hover:underline cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-400" />
                                <span>View</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* VIEW 8: SETTINGS / PROFILE (Screenshot 3 Reference)            */}
            {/* ============================================================== */}
            {activeTab === 'settings' && (
              <div className="space-y-6 max-w-4xl">
                <div className="bg-[#0B1528] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                    <div className="w-24 h-24 rounded-3xl bg-white/10 border-2 border-emerald-500/40 p-2 flex items-center justify-center shrink-0">
                      <div className="w-full h-full rounded-2xl bg-emerald-700 text-white font-black text-3xl flex items-center justify-center">
                        {user.avatarLetter || user.name.charAt(0)}
                      </div>
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-1">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <h2 className="text-xl font-black text-white">{user.name}</h2>
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          ADMIN
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center space-x-1">
                          <ShieldCheck className="w-3 h-3 mr-0.5" />
                          <span>2FA Secured</span>
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 space-y-1">
                        <div className="flex items-center justify-center sm:justify-start space-x-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{user.email}</span>
                          <span>&bull;</span>
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>+880222334455</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/10 max-w-xs">
                        <div className="flex justify-between text-[11px] font-bold mb-1">
                          <span className="text-slate-400">Profile Health</span>
                          <span className="text-emerald-400">100%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-400 h-full rounded-full w-full" />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Verified & encrypted system administration credentials
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">Personal & Contact Information</h3>
                      <p className="text-xs text-slate-500">Your core profile attributes used across hospital network records</p>
                    </div>
                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Edit Details
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={user.name}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                        Official Email
                      </label>
                      <input
                        type="email"
                        readOnly
                        value={user.email}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                        Administrative Role
                      </label>
                      <input
                        type="text"
                        readOnly
                        value="Platform Super Administrator"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                        Operating District
                      </label>
                      <input
                        type="text"
                        readOnly
                        value="Dhaka (National Directorate)"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-900"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                        Mailing / Office Address
                      </label>
                      <input
                        type="text"
                        readOnly
                        value="Directorate General of Health Services (DGHS), Mohakhali, Dhaka-1212"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Audit Log Detail Modal */}
        {selectedAuditLog && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-slate-800" />
                  <h3 className="text-base font-extrabold text-slate-900">Audit Record Details</h3>
                </div>
                <button
                  onClick={() => setSelectedAuditLog(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-2 text-slate-700">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Timestamp:</span>
                  <span className="font-mono font-bold">{selectedAuditLog.timestamp}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Actor Account:</span>
                  <span className="font-bold">{selectedAuditLog.user}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Action:</span>
                  <span className="font-bold text-slate-900">{selectedAuditLog.action}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Target Resource:</span>
                  <span>{selectedAuditLog.resource} ({selectedAuditLog.resourceId})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">IP Address:</span>
                  <span className="font-mono">{selectedAuditLog.ipAddress}</span>
                </div>
                <div className="py-2">
                  <span className="text-slate-400 block mb-1">Details:</span>
                  <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px]">
                    {selectedAuditLog.details}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedAuditLog(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Detail Profile Modal */}
        {selectedUserDetail && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center">
                    {(selectedUserDetail?.name || 'Donor').charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{selectedUserDetail?.name || 'Anonymous Donor'}</h3>
                    <BloodGroupBadge bloodGroup={selectedUserDetail?.bloodGroup || 'O+'} size="sm" />
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUserDetail(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400">Direct Phone:</span>
                  <span className="font-bold text-slate-900">{selectedUserDetail?.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400">Operating District:</span>
                  <span className="font-bold text-slate-900">{selectedUserDetail?.district || selectedUserDetail?.location || 'Dhaka'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400">Total Donations:</span>
                  <span className="font-bold text-slate-900">{selectedUserDetail?.totalDonations || 0} times</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400">Eligibility Status:</span>
                  <span className={`font-bold ${selectedUserDetail?.canDonate ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {selectedUserDetail?.canDonate ? 'Eligible to Donate' : 'In 90-Day Cooldown'}
                  </span>
                </div>
              </div>

              <div className="pt-3 flex justify-between space-x-2">
                <a
                  href={`tel:${selectedUserDetail?.phone || ''}`}
                  className="flex-1 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-center"
                >
                  Call Donor
                </a>
                <button
                  onClick={() => {
                    const conv = conversations.find((c) => c.participantId === selectedUserDetail.id);
                    if (conv) setSelectedConvId(conv.id);
                    setSelectedUserDetail(null);
                    setActiveTab('messages');
                  }}
                  className="flex-1 py-2 rounded-xl bg-[#C62828] text-white font-bold cursor-pointer"
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Verification Status Confirm Modal */}
        <ConfirmModal
          isOpen={verifyConfirm !== null}
          onClose={() => setVerifyConfirm(null)}
          onConfirm={async () => {
            if (verifyConfirm) {
              const target = verifyConfirm;
              setVerifyConfirm(null);
              await handleVerify(target.id, target.currentVerified);
            }
          }}
          title={verifyConfirm?.currentVerified ? 'Revoke Facility Clearance?' : 'Approve Facility License?'}
          description={
            verifyConfirm?.currentVerified
              ? `Are you sure you want to revoke official authorization for "${verifyConfirm?.name}"? Clinical broadcasts and requisition matching will be suspended.`
              : `Grant verified DGHS healthcare authorization to "${verifyConfirm?.name}"? This allows nationwide blood requisition broadcasting.`
          }
          confirmText={verifyConfirm?.currentVerified ? 'Revoke Access' : 'Approve Facility'}
          variant={verifyConfirm?.currentVerified ? 'danger' : 'success'}
        />
      </div>
    </RoleGuard>
  );
}
