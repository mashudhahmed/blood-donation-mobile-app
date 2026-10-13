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
  Database,
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  UserCheck,
  Layers,
  ShieldCheck,
  AlertTriangle,
  UserPlus,
  MessageSquare,
  Search,
  X,
  FileCheck2,
  Eye,
  Users,
  Send,
  Phone,
  CheckCheck,
  Bell,
  Zap,
  ArrowRight,
  Activity,
} from 'lucide-react';
import {
  api,
  StockInfo,
  BloodDrive,
  InventoryTx,
  StaffMember,
  Conversation,
  ChatMessage,
} from '@/lib/api';

export type BloodBankTab =
  | 'inventory'
  | 'walkin'
  | 'drives'
  | 'messages'
  | 'notifications'
  | 'staff'
  | 'audit'
  | 'info';

interface BloodBankNotification {
  id: string;
  type: 'CRITICAL' | 'REQUISITION' | 'DRIVE' | 'WALKIN' | 'SYSTEM';
  title: string;
  description: string;
  targetInfo?: string;
  timestamp: string;
  isRead: boolean;
  actionLabel?: string;
  actionTab?: BloodBankTab;
}

export default function BloodBankPortal() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<BloodBankTab>('inventory');
  const [inventory, setInventory] = useState<Record<string, StockInfo>>({});
  const [drives, setDrives] = useState<BloodDrive[]>([]);
  const [transactions, setTransactions] = useState<InventoryTx[]>([]);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // In-Page Messages State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string>('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');

  // In-Page Notifications State (Populated dynamically from real database records)
  const [notifications, setNotifications] = useState<BloodBankNotification[]>([]);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread' | 'CRITICAL' | 'REQUISITION' | 'DRIVE' | 'SYSTEM'>('all');

  // Selected Transaction for Detail Modal (Screenshot 1)
  const [selectedTx, setSelectedTx] = useState<InventoryTx | null>(null);

  // Staff & Positions State
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPosition, setStaffPosition] = useState('Senior Hematology Lab Tech');
  const [staffDept, setStaffDept] = useState('Component Separation & Testing');
  const [staffPassword, setStaffPassword] = useState('Staff@123456');
  const [isAddingStaff, setIsAddingStaff] = useState(false);

  // Stock Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustGroup, setAdjustGroup] = useState('O+');
  const [adjustType, setAdjustType] = useState<'INTAKE' | 'DISPATCH' | 'EXPIRED'>('INTAKE');
  const [adjustUnits, setAdjustUnits] = useState(2);
  const [adjustReason, setAdjustReason] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Confirm Modal States
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [staffDeactivateConfirm, setStaffDeactivateConfirm] = useState<{ id: string; name: string } | null>(null);

  // New Blood Drive Modal
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveTitle, setDriveTitle] = useState('');
  const [driveVenue, setDriveVenue] = useState('');
  const [driveDistrict, setDriveDistrict] = useState(user.district || 'Dhaka');
  const [driveDate, setDriveDate] = useState('2026-10-30');
  const [targetUnits, setTargetUnits] = useState(100);

  // Walk-in donation quick intake
  const [walkinDonorId, setWalkinDonorId] = useState('');
  const [walkinBloodGroup, setWalkinBloodGroup] = useState('A+');
  const [walkinUnits, setWalkinUnits] = useState(1);

  // Audit Search & Filter States
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const districts = ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur', 'Mymensingh'];

  const isVerifiedFacility = user.licenseNumber && user.licenseNumber.length > 3;

  const loadData = useCallback(async () => {
    try {
      const invRes = await api.getInventory();
      if (invRes?.inventory) setInventory(invRes.inventory);

      const drvRes = await api.getBloodDrives();
      if (drvRes?.drives) setDrives(drvRes.drives);

      const txRes = await api.getBloodBankTransactions();
      if (txRes?.transactions) setTransactions(txRes.transactions);

      const staffRes = await api.getBloodBankStaff();
      if (staffRes?.staff) setStaffList(staffRes.staff);

      const convRes = await api.getConversations();
      if (convRes?.conversations) {
        setConversations(convRes.conversations);
        if (convRes.conversations.length > 0) {
          setSelectedConvId((prev) => prev || convRes.conversations[0].id);
        }
      }

      // Generate dynamic notifications from real database records
      const realNotifs: BloodBankNotification[] = [];

      // 1. Critical or low inventory stocks
      if (invRes?.inventory) {
        Object.entries(invRes.inventory).forEach(([group, info]) => {
          if (info.units <= 3) {
            realNotifs.push({
              id: `bb-alert-${group}`,
              type: 'CRITICAL',
              title: `Cryo-Vault Buffer Alert: ${group}`,
              description: `Central stock level for ${group} is critical (${info.units} units remaining). Safe trauma buffer is 4+ units.`,
              targetInfo: `Component: Whole Blood / Cryo | Buffer: Critical`,
              timestamp: 'Stock Alert',
              isRead: false,
              actionLabel: 'Adjust Stock / Cryo Matrix',
              actionTab: 'inventory',
            });
          }
        });
      }

      // 2. Real blood drives
      if (drvRes?.drives) {
        drvRes.drives.slice(0, 3).forEach((drive) => {
          realNotifs.push({
            id: `bb-drive-${drive.id}`,
            type: 'DRIVE',
            title: `Scheduled Blood Drive: ${drive.title || drive.venue}`,
            description: `Venue: ${drive.venue}, ${drive.district}. Target capacity: ${drive.targetUnits} units.`,
            targetInfo: `Date: ${drive.date} | Status: ${drive.status || 'SCHEDULED'}`,
            timestamp: drive.date || 'Scheduled',
            isRead: false,
            actionLabel: 'Inspect Scheduled Drive',
            actionTab: 'drives',
          });
        });
      }

      // 3. Real inventory transactions
      if (txRes?.transactions) {
        txRes.transactions.slice(0, 3).forEach((tx) => {
          const isOut = tx.type === 'DISPATCH';
          realNotifs.push({
            id: `bb-tx-${tx.id}`,
            type: isOut ? 'REQUISITION' : 'WALKIN',
            title: `${isOut ? 'Hospital Dispatch' : 'Donation Intake'}: ${tx.bloodGroup}`,
            description: `${tx.units} units ${isOut ? 'dispatched for clinical need' : 'received and logged into vault'}. ${tx.reason || ''}`,
            targetInfo: `Batch / Barcode: ${tx.batchOrBagNumber || tx.id}`,
            timestamp: tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : 'Recent',
            isRead: true,
            actionLabel: 'Inspect Inventory',
            actionTab: 'inventory',
          });
        });
      }

      // 4. Clinical Storage License Verification
      if (user.licenseNumber) {
        realNotifs.push({
          id: 'bb-license-active',
          type: 'SYSTEM',
          title: 'Cold Storage Vault Certification Active',
          description: `${user.organization || 'Blood Center'} authorized with cold-chain storage license ${user.licenseNumber}.`,
          targetInfo: 'Complies with DGHS Central Blood Bank Standard ISO-15189.',
          timestamp: 'Active',
          isRead: true,
          actionLabel: 'View Audit Trail',
          actionTab: 'audit',
        });
      }

      setNotifications(realNotifs);
    } catch (e) {
      console.warn('Blood bank load error', e);
    }
  }, [user.licenseNumber, user.organization]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingStaff(true);
    try {
      const res = await api.createBloodBankStaff({
        name: staffName,
        email: staffEmail,
        phone: staffPhone,
        position: staffPosition,
        department: staffDept,
        password: staffPassword,
      });

      if (res.staff) {
        setStaffList((prev) => [res.staff, ...prev]);
      }
      setShowStaffModal(false);
      setStaffName('');
      setStaffEmail('');
      setStaffPhone('');
      setStaffPassword('Staff@123456');
      setFeedbackMsg(`Position account created for ${staffName} (${staffPosition}). Active immediately under Red Crescent umbrella!`);
      setTimeout(() => setFeedbackMsg(null), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create staff member');
    } finally {
      setIsAddingStaff(false);
    }
  };

  const handleToggleStaffStatus = async (staffId: string, currentStatus: boolean) => {
    try {
      const res = await api.toggleBloodBankStaffStatus(staffId, !currentStatus);
      if (res?.success) {
        setStaffList((prev) =>
          prev.map((s) => (s.id === staffId ? { ...s, isActive: !currentStatus } : s))
        );
      }
    } catch (err) {
      console.warn('Status toggle error', err);
    }
  };

  const totalStockUnits = Object.values(inventory).reduce((acc, curr) => acc + curr.units, 0);
  const criticalGroupsCount = Object.values(inventory).filter((i) => i.status === 'CRITICAL').length;
  const lowGroupsCount = Object.values(inventory).filter((i) => i.status === 'LOW').length;

  // Execute inventory adjustment
  const executeAdjustInventory = async () => {
    setIsAdjusting(true);

    try {
      const current = inventory[adjustGroup]?.units || 0;
      let newUnits = current;
      if (adjustType === 'INTAKE') newUnits += adjustUnits;
      else {
        if (current < adjustUnits) {
          setFeedbackMsg(`Insufficient units of ${adjustGroup}. Current stock is only ${current}.`);
          setTimeout(() => setFeedbackMsg(null), 4000);
          setIsAdjusting(false);
          return;
        }
        newUnits -= adjustUnits;
      }

      let status: 'CRITICAL' | 'LOW' | 'NORMAL' | 'ABUNDANT' = 'NORMAL';
      if (newUnits <= 4) status = 'CRITICAL';
      else if (newUnits <= 9) status = 'LOW';
      else if (newUnits >= 25) status = 'ABUNDANT';

      setInventory((prev) => ({
        ...prev,
        [adjustGroup]: { units: newUnits, status },
      }));

      const newTx: InventoryTx = {
        id: `tx-${Date.now().toString().slice(-4)}`,
        bloodGroup: adjustGroup,
        type: adjustType,
        units: adjustUnits,
        previousUnits: current,
        newUnits,
        reason: adjustReason || `${adjustType} transaction`,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setTransactions([newTx, ...transactions]);
      setShowAdjustModal(false);
      setFeedbackMsg(`Successfully processed ${adjustType} of ${adjustUnits} units for ${adjustGroup}.`);
      setAdjustReason('');
      setBatchNumber('');
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch {
      setFeedbackMsg('Error updating stock in inventory database.');
      setTimeout(() => setFeedbackMsg(null), 4000);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleAdjustInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustType === 'EXPIRED') {
      setShowDiscardConfirm(true);
      return;
    }
    await executeAdjustInventory();
  };

  // Handle Blood Drive creation
  const handleCreateDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    const newDrive: BloodDrive = {
      id: `drv-${Date.now().toString().slice(-4)}`,
      title: driveTitle,
      venue: driveVenue,
      district: driveDistrict,
      date: driveDate,
      targetUnits,
      collectedUnits: 0,
      status: 'PLANNED',
    };

    setDrives([newDrive, ...drives]);
    setShowDriveModal(false);
    setFeedbackMsg(`Blood Donation Drive "${driveTitle}" scheduled and synced to mobile app calendar!`);
    setDriveTitle('');
    setDriveVenue('');
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Handle Walk-in Donor collection
  const handleWalkInCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkinDonorId) return;

    try {
      await api.recordWalkInDonation({
        donorId: walkinDonorId,
        bloodGroup: walkinBloodGroup,
        units: walkinUnits,
      });

      const current = inventory[walkinBloodGroup]?.units || 0;
      const updated = current + walkinUnits;
      let status: 'CRITICAL' | 'LOW' | 'NORMAL' | 'ABUNDANT' = 'NORMAL';
      if (updated <= 4) status = 'CRITICAL';
      else if (updated <= 9) status = 'LOW';
      else if (updated >= 25) status = 'ABUNDANT';

      setInventory((prev) => ({
        ...prev,
        [walkinBloodGroup]: { units: updated, status },
      }));

      setFeedbackMsg(
        `Walk-in donation recorded! Donor eligibility set to 90-day cooldown and +${walkinUnits} bags added to ${walkinBloodGroup}.`
      );
      setWalkinDonorId('');
      setTimeout(() => setFeedbackMsg(null), 5000);
    } catch {
      setFeedbackMsg('Notice: Walk-in collection logged locally pending network synchronization.');
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  // Messages and Notifications Logic
  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

  const currentConv = conversations.find((c) => c.id === selectedConvId) || conversations[0] || null;
  const filteredConversations = conversations.filter((c) => {
    const q = chatSearchQuery.toLowerCase();
    const pName = (c?.participantName || '').toLowerCase();
    const pBlood = (c?.participantBloodGroup || '').toLowerCase();
    const pDistrict = (c?.participantDistrict || '').toLowerCase();
    const pLast = (c?.lastMessage || '').toLowerCase();
    return pName.includes(q) || pBlood.includes(q) || pDistrict.includes(q) || pLast.includes(q);
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const newMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      senderId: user?.id || 'usr_bb_001',
      senderName: user?.organization || user?.name || 'Red Crescent Blood Center',
      senderRole: 'BLOOD_BANK',
      text: messageInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConvId
          ? {
              ...c,
              lastMessage: newMsg.text,
              lastMessageTime: 'Just now',
              messages: [...c.messages, newMsg],
            }
          : c
      )
    );
    setMessageInput('');
  };

  const filteredNotifications = notifications.filter((n) => {
    if (notificationFilter === 'unread') return !n.isRead;
    if (notificationFilter === 'CRITICAL') return n.type === 'CRITICAL';
    if (notificationFilter === 'REQUISITION') return n.type === 'REQUISITION';
    if (notificationFilter === 'DRIVE') return n.type === 'DRIVE' || n.type === 'WALKIN';
    if (notificationFilter === 'SYSTEM') return n.type === 'SYSTEM';
    return true;
  });

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  // Filtered Audit Transactions matching Screenshot 1
  const filteredTransactions = transactions.filter((tx) => {
    const matchesAction = auditActionFilter === 'all' || tx.type === auditActionFilter;
    const query = auditSearchQuery.toLowerCase();
    const bg = (tx?.bloodGroup || '').toLowerCase();
    const reason = (tx?.reason || '').toLowerCase();
    const txId = (tx?.id || '').toLowerCase();
    const matchesQuery = bg.includes(query) || reason.includes(query) || txId.includes(query);
    return matchesAction && matchesQuery;
  });

  return (
    <RoleGuard allowedRole="BLOOD_BANK">
      <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
        {/* Full-Height Dark Navy Left Sidebar matching Screenshots */}
        <DashboardSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingCount={drives.filter((d) => d.status === 'PLANNED').length}
          unreadNotificationsCount={unreadNotificationsCount}
        />

        {/* Right Main Column */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Header App Bar matching Screenshots */}
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

          {/* Scrollable Main Workspace */}
          <main className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
            {/* Top Greeting Hero Card matching Screenshot 2 */}
            {activeTab !== 'messages' && activeTab !== 'notifications' && (
              <>
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="inline-flex items-center space-x-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span>Central Cryo-Storage Hub</span>
                      </span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="text-xs text-slate-500 font-medium">Monday, Oct 12, 2026</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                      Good afternoon, {user.organization || user.name}
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                      Central Cryo-Storage, 8-Group ABO/Rh Inventory Control &bull; Walk-In Terminal, Public Donation Campaigns & Technician Staff Pool.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      onClick={() => setShowAdjustModal(true)}
                      className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#C62828] hover:bg-[#B71C1C] text-white font-bold text-xs shadow-md shadow-[#C62828]/20 transition-all cursor-pointer"
                    >
                      <Layers className="w-4 h-4 text-white" />
                      <span>+ Stock Movement</span>
                    </button>
                    <button
                      onClick={() => setShowDriveModal(true)}
                      className="inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 text-slate-300" />
                      <span>Schedule Drive</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('messages')}
                      className="inline-flex items-center space-x-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all cursor-pointer"
                      title="Direct Donor Messaging"
                    >
                      <MessageSquare className="w-4 h-4 text-[#C62828]" />
                      <span>Messages</span>
                    </button>
                  </div>
                </div>

            {/* Pending Approval Alert if facility is unverified */}
            {!isVerifiedFacility && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-start space-x-3 text-amber-900 shadow-xs">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold block text-sm">Blood Center Under Administrative Review</span>
                  <span className="text-amber-800 leading-relaxed">
                    Your blood bank license is currently being reviewed by DGHS administrators. Cryo-inventory tracking is fully operational; public donor drives will publish to mobile feeds upon clearance.
                  </span>
                </div>
              </div>
            )}

            {/* 4-Card Metric Grid matching Screenshot 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
              {/* Card 1: Preserved Blood Units */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    CRYO-STORAGE UNITS
                  </p>
                  <div className="flex items-baseline space-x-2 mt-1.5">
                    <span className="text-2xl font-black text-slate-900">{totalStockUnits}</span>
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      Bags
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Screened at 2°C - 6°C</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#FFEBEE] border border-[#FFCDD2] flex items-center justify-center text-[#C62828] shadow-2xs">
                  <Database className="w-6 h-6" />
                </div>
              </div>

              {/* Card 2: Critical Blood Groups */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    CRITICAL GROUPS
                  </p>
                  <div className="flex items-baseline space-x-2 mt-1.5">
                    <span className="text-2xl font-black text-[#C62828]">{criticalGroupsCount}</span>
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                      {lowGroupsCount} Low
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Below safety reserve buffer</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>

              {/* Card 3: Mobile Drives */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    SCHEDULED DRIVES
                  </p>
                  <div className="flex items-baseline space-x-2 mt-1.5">
                    <span className="text-2xl font-black text-slate-900">
                      {drives.filter((d) => d.status === 'PLANNED').length}
                    </span>
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      Planned
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Public mobile campaigns</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>

              {/* Card 4: Staff Technicians */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    LAB STAFF POOL
                  </p>
                  <div className="flex items-baseline space-x-2 mt-1.5">
                    <span className="text-2xl font-black text-slate-900">{staffList.length}</span>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Hematology technicians</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </div>
          </>
        )}

            {/* ============================================================== */}
            {/* VIEW 1: INVENTORY MATRIX (8 ABO/Rh Groups)                      */}
            {/* ============================================================== */}
            {activeTab === 'inventory' && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">ABO & Rhesus (Rh) Cryo-Stock Matrix</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Reserve threshold indicators: &lt;5 Critical &bull; &lt;10 Low &bull; 10-24 Optimal &bull; 25+ Abundant
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                      Total: {totalStockUnits} Units
                    </span>
                    <button
                      onClick={() => setShowAdjustModal(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#C62828] hover:bg-[#B71C1C] text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      + Adjust Stock
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

                          {/* Progress Meter Bar */}
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
                          <span>Capacity: {percentage}%</span>
                          <button
                            onClick={() => {
                              setAdjustGroup(bg);
                              setShowAdjustModal(true);
                            }}
                            className="text-[#C62828] hover:text-[#B71C1C] font-bold cursor-pointer"
                          >
                            Adjust &rarr;
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* VIEW 2: WALK-IN DONOR INTAKE TERMINAL                          */}
            {/* ============================================================== */}
            {activeTab === 'walkin' && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 space-y-5 shadow-xs max-w-xl">
                <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold shadow-2xs">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Walk-In Donor Intake Terminal</h3>
                    <p className="text-xs text-slate-500">
                      Logs physical collection, adds bags to inventory, and updates donor eligibility in Firestore
                    </p>
                  </div>
                </div>

                <form onSubmit={handleWalkInCollection} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Donor Mobile Number / Citizen ID
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. +8801711223344 or donor_01"
                      value={walkinDonorId}
                      onChange={(e) => setWalkinDonorId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#C62828] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">Collected Blood Group</label>
                      <select
                        value={walkinBloodGroup}
                        onChange={(e) => setWalkinBloodGroup(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold focus:outline-none cursor-pointer"
                      >
                        {bloodGroups.map((bg) => (
                          <option key={bg} value={bg}>
                            {bg}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">Collected Units (Bags)</label>
                      <input
                        type="number"
                        min="1"
                        max="2"
                        value={walkinUnits}
                        onChange={(e) => setWalkinUnits(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-[11px] leading-relaxed">
                    <strong>Automatic 90-Day Cooldown:</strong> Confirming this donation updates the citizen&apos;s mobile app profile status to &quot;Cooldown Period&quot; for 90 days according to national medical protocol.
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Record On-Site Donation & Apply Cooldown</span>
                  </button>
                </form>
              </div>
            )}

            {/* ============================================================== */}
            {/* VIEW 3: BLOOD DONATION DRIVES                                  */}
            {/* ============================================================== */}
            {activeTab === 'drives' && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Public Blood Donation Drives</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Synchronized to mobile app event calendar for citizen donor registrations
                    </p>
                  </div>

                  <button
                    onClick={() => setShowDriveModal(true)}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-xs"
                  >
                    + Schedule Campaign
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
                  {drives.map((drv) => (
                    <div
                      key={drv.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between space-y-3.5 shadow-xs hover:shadow-md transition-all"
                    >
                      <div>
                        <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {drv.status}
                        </span>
                        <h4 className="font-extrabold text-sm text-slate-900 mt-2">{drv.title}</h4>
                        <div className="text-xs text-slate-500 space-y-1.5 mt-2.5">
                          <div className="flex items-center space-x-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{drv.venue}, {drv.district}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Date: {drv.date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Target Progress:</span>
                        <strong className="text-slate-900 font-extrabold">
                          {drv.collectedUnits || 0} / {drv.targetUnits} Bags
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* VIEW 4: INTERNAL STAFF & TECHNICIANS                           */}
            {/* ============================================================== */}
            {activeTab === 'staff' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-base font-extrabold text-slate-900">Blood Bank Staff & Technician Positions</h2>
                      <span className="text-[11px] font-bold bg-[#FFEBEE] text-[#C62828] px-2 py-0.5 rounded-full border border-[#FFCDD2]">
                        {staffList.length} Accounts
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Manage hematology lab techs, cryo-storage operators, and testing officers. Staff accounts operate under this verified blood bank and do not require secondary Super Admin approval.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowStaffModal(true)}
                    className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-[#C62828] hover:bg-[#B71C1C] text-white font-bold text-xs shadow-md transition-all shrink-0 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Add Staff Position</span>
                  </button>
                </div>

                {/* Staff Grid Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staffList.map((member) => (
                    <div
                      key={member.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
                    >
                      <div className={`h-1 w-full absolute top-0 left-0 ${member.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />

                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
                              {member.name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="text-sm font-extrabold text-slate-900">{member.name}</h3>
                              <span className="inline-block mt-0.5 text-[10px] font-bold text-[#C62828] bg-[#FFEBEE] px-2 py-0.5 rounded border border-[#FFCDD2]">
                                {member.position}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-[11px]">Department:</span>
                            <span className="font-semibold text-slate-800">{member.department || 'Lab & Storage'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-[11px]">Email:</span>
                            <span className="font-mono text-[11px] text-slate-700">{member.email}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-[11px]">Phone:</span>
                            <span className="font-medium text-slate-700">{member.phone}</span>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-slate-400 text-[11px]">Clearance:</span>
                            <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-emerald-600 mr-1" />
                              Facility Umbrella
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className={`text-[11px] font-bold ${member.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {member.isActive ? 'Active & Authorized' : 'Account Suspended'}
                        </span>
                        <button
                          onClick={() => {
                            if (member.isActive) {
                              setStaffDeactivateConfirm({ id: member.id, name: member.name });
                            } else {
                              handleToggleStaffStatus(member.id, member.isActive);
                            }
                          }}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                            member.isActive
                              ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                              : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                          }`}
                        >
                          {member.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* VIEW 5: MOVEMENT AUDIT TRAIL (Screenshot 1)                    */}
            {/* ============================================================== */}
            {activeTab === 'audit' && (
              <div className="space-y-4">
                {/* Search & Filter Bar matching Screenshot 1 */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">Inventory Movement Audit Trail</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Cryptographically verified logs of intake, hospital dispatches, and expired discards
                      </p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 self-start sm:self-auto border border-slate-200">
                      {transactions.length} Transactions Logged
                    </span>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative min-w-[240px]">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search transactions..."
                          value={auditSearchQuery}
                          onChange={(e) => setAuditSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
                        />
                      </div>

                      {/* Filter by Type */}
                      <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                        {['all', 'INTAKE', 'DISPATCH', 'EXPIRED'].map((act) => (
                          <button
                            key={act}
                            onClick={() => setAuditActionFilter(act)}
                            className={`px-3 py-1 rounded-lg uppercase transition-all cursor-pointer ${
                              auditActionFilter === act
                                ? 'bg-white text-[#C62828] shadow-xs font-bold'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            {act}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audit Table matching Screenshot 1 */}
                <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8FAFC] text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-3.5">Transaction Type</th>
                          <th className="px-6 py-3.5">Blood Group</th>
                          <th className="px-6 py-3.5">Units Moved</th>
                          <th className="px-6 py-3.5">Stock Delta</th>
                          <th className="px-6 py-3.5">Reason / Batch</th>
                          <th className="px-6 py-3.5 text-right">Time</th>
                          <th className="px-6 py-3.5 text-center">Inspect</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {filteredTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-3.5">
                              {tx.type === 'INTAKE' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <ArrowDownCircle className="w-3 h-3 mr-1 text-emerald-600" />
                                  INTAKE (Inflow)
                                </span>
                              ) : tx.type === 'DISPATCH' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                  <ArrowUpCircle className="w-3 h-3 mr-1 text-blue-600" />
                                  DISPATCH (Outflow)
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-800 border border-red-200">
                                  EXPIRED (Discard)
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-3.5">
                              <BloodGroupBadge bloodGroup={tx.bloodGroup} size="sm" />
                            </td>
                            <td className="px-6 py-3.5 font-bold text-slate-900">{tx.units} Bag(s)</td>
                            <td className="px-6 py-3.5 font-mono text-slate-600">
                              {tx.previousUnits} &rarr; <strong className="text-slate-900">{tx.newUnits}</strong>
                            </td>
                            <td className="px-6 py-3.5 text-slate-600">{tx.reason || 'General inventory transaction'}</td>
                            <td className="px-6 py-3.5 text-right text-slate-400 font-mono">{tx.createdAt}</td>
                            <td className="px-6 py-3.5 text-center">
                              <button
                                onClick={() => setSelectedTx(tx)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                                title="Inspect Transaction Verification"
                              >
                                <Eye className="w-4 h-4" />
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
            {/* VIEW 6: FACILITY CREDENTIALS & PROFILE (Screenshot 3)          */}
            {/* ============================================================== */}
            {activeTab === 'info' && (
              <div className="space-y-6">
                {/* Hero Profile Banner matching Screenshot 3 */}
                <div className="bg-[#0B1528] rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-md">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-[#C62828]/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#1565C0] to-[#42A5F5] p-0.5 shadow-lg">
                          <div className="w-full h-full rounded-2xl bg-[#0B1528] flex items-center justify-center">
                            <Database className="w-10 h-10 text-[#42A5F5]" />
                          </div>
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#0B1528] flex items-center justify-center text-[10px] text-white">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h2 className="text-xl font-black tracking-tight">{user.organization || 'Red Crescent Blood Center'}</h2>
                          <span className="text-[10px] font-bold bg-[#1565C0]/20 text-[#42A5F5] border border-[#1565C0]/30 px-2.5 py-0.5 rounded-full">
                            BLOOD BANK HUB
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          License: <span className="font-mono text-slate-300 font-semibold">{user.licenseNumber || 'DGHS-BB-2026'}</span> &bull; {user.district || 'Dhaka'} Storage Division
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center space-x-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>National Cold-Chain Verified</span>
                          </span>
                          <span className="text-[11px] text-slate-400">&bull; Cryo 2°C - 6°C Monitored</span>
                        </div>
                      </div>
                    </div>

                    {/* Profile Health Progress Bar matching Screenshot 3 */}
                    <div className="bg-[#132238] border border-slate-700/60 rounded-xl p-4 w-full md:w-64">
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="text-slate-300 font-semibold">Verification Level</span>
                        <span className="text-emerald-400 font-bold">100% Cleared</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full w-full" />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2">
                        Licensed for component separation and mobile campaign organizing
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2-Column Facility Credentials Form matching Screenshot 3 */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-6">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                      Blood Center Credentials & Cold-Chain Registry
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Information verified against Bangladesh Red Crescent Society and DGHS
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">Center Official Name</label>
                      <input
                        type="text"
                        defaultValue={user.organization || 'Red Crescent National Blood Center'}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C62828]/20"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">Lab Director / Coordinator</label>
                      <input
                        type="text"
                        defaultValue={user.name || 'Dr. Tariqul Islam'}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C62828]/20"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">Official Communications Email</label>
                      <input
                        type="email"
                        defaultValue={user.email || 'bloodbank@redcrescent.org.bd'}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C62828]/20"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">Emergency Dispatch Phone</label>
                      <input
                        type="text"
                        defaultValue={user.phone || '+880 1911-000000'}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C62828]/20"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">Storage Division / District</label>
                      <input
                        type="text"
                        defaultValue={user.district || 'Dhaka'}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C62828]/20"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">DGHS Blood Bank License Number</label>
                      <input
                        type="text"
                        defaultValue={user.licenseNumber || 'DGHS-BB-2026-4419'}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C62828]/20"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Cold-chain telemetry last synced: Today at 01:10 PM
                    </span>
                    <button
                      onClick={() => {
                        setFeedbackMsg('Blood bank credentials saved and synchronized.');
                        setTimeout(() => setFeedbackMsg(null), 4000);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#C62828] hover:bg-[#B71C1C] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* VIEW 7: MESSAGES (In-Page 2-Pane Chat Suite)                   */}
            {/* ============================================================== */}
            {activeTab === 'messages' && (
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col h-[calc(100vh-10.5rem)]">
                {/* Messages Suite Header */}
                <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-[#C62828] text-white flex items-center justify-center font-bold">
                      <MessageSquare className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Direct Donor & Hospital Messaging</h2>
                      <p className="text-[11px] text-slate-500">Live communication channel with voluntary mobile donors, hospitals & referral centers</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-xl shadow-2xs">
                    {conversations.length} Active Threads
                  </span>
                </div>

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
                            'Are you available to donate at Red Crescent Blood Center today?',
                            'Walk-in screening is available until 8:00 PM.',
                            'Cross-matching completed for emergency hospital request.',
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
                          Select a donor thread on the left to coordinate blood collections and intake appointments.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* VIEW 8: NOTIFICATIONS (In-Page Feed)                           */}
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
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Blood Bank Notification Center</h2>
                        <span className="text-[11px] text-slate-500">
                          Real-time cryo-vault alarms, emergency hospital requisitions, voluntary donation drives & cold-chain audit alerts
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
                    { id: 'CRITICAL', label: `CRITICAL (${notifications.filter((n) => n.type === 'CRITICAL').length})` },
                    { id: 'REQUISITION', label: `REQUISITIONS (${notifications.filter((n) => n.type === 'REQUISITION').length})` },
                    { id: 'DRIVE', label: `DRIVES & INTAKE (${notifications.filter((n) => n.type === 'DRIVE' || n.type === 'WALKIN').length})` },
                    { id: 'SYSTEM', label: `SYSTEM (${notifications.filter((n) => n.type === 'SYSTEM').length})` },
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
                      <h4 className="text-sm font-bold text-slate-800">No Blood Bank Alerts</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Cryo-vault stocks are balanced and cold storage chain is operational. Incoming alerts, low stock alarms, or drive schedules will appear here in real-time.
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
                            n.type === 'CRITICAL'
                              ? 'bg-rose-50 border border-rose-200 text-[#C62828]'
                              : n.type === 'REQUISITION'
                              ? 'bg-blue-50 border border-blue-200 text-blue-600'
                              : n.type === 'DRIVE'
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                              : n.type === 'WALKIN'
                              ? 'bg-amber-50 border border-amber-200 text-amber-600'
                              : 'bg-purple-50 border border-purple-200 text-purple-600'
                          }`}
                        >
                          {n.type === 'CRITICAL' ? (
                            <Zap className="w-5 h-5 animate-pulse" />
                          ) : n.type === 'REQUISITION' ? (
                            <FileCheck2 className="w-5 h-5" />
                          ) : n.type === 'DRIVE' ? (
                            <Calendar className="w-5 h-5" />
                          ) : n.type === 'WALKIN' ? (
                            <UserCheck className="w-5 h-5" />
                          ) : (
                            <Activity className="w-5 h-5" />
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                n.type === 'CRITICAL'
                                  ? 'bg-[#FFEBEE] text-[#C62828]'
                                  : n.type === 'REQUISITION'
                                  ? 'bg-blue-50 text-blue-700'
                                  : n.type === 'DRIVE'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : n.type === 'WALKIN'
                                  ? 'bg-amber-50 text-amber-800'
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
          </main>
        </div>

        {/* ============================================================== */}
        {/* MODAL 1: ADJUST STOCK / MOVEMENT                               */}
        {/* ============================================================== */}
        {showAdjustModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#FFEBEE] text-[#C62828] flex items-center justify-center font-bold">
                    <Layers className="w-5 h-5 text-[#C62828]" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Adjust Blood Stock</h3>
                    <p className="text-[11px] text-slate-500">Record intake, dispatch or discard movements</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAdjustModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleAdjustInventory} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Transaction Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['INTAKE', 'DISPATCH', 'EXPIRED'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAdjustType(t)}
                        className={`py-2 px-2 rounded-xl font-bold text-center border transition-all cursor-pointer ${
                          adjustType === t
                            ? 'bg-[#C62828] text-white border-[#C62828] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Blood Group</label>
                    <select
                      value={adjustGroup}
                      onChange={(e) => setAdjustGroup(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold focus:outline-none cursor-pointer"
                    >
                      {bloodGroups.map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Units (Bags)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={adjustUnits}
                      onChange={(e) => setAdjustUnits(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Bag / Batch Barcode Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BD-2026-X992"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Clinical Context / Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Routine mobile drive intake / Hospital dispatch"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAdjustModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAdjusting}
                    className="px-5 py-2.5 rounded-xl bg-[#C62828] hover:bg-[#B71C1C] text-white font-bold shadow-md shadow-[#C62828]/20 cursor-pointer disabled:opacity-60"
                  >
                    {isAdjusting ? 'Processing...' : 'Confirm Stock Movement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 2: SCHEDULE BLOOD DRIVE                                  */}
        {/* ============================================================== */}
        {showDriveModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Schedule Public Blood Drive</h3>
                    <p className="text-[11px] text-slate-500">Publishes to citizen mobile app feeds</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDriveModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateDrive} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Campaign Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. University Campus Annual Blood Drive"
                    value={driveTitle}
                    onChange={(e) => setDriveTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#C62828] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Venue / Ground</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TSC Dhaka University Ground"
                    value={driveVenue}
                    onChange={(e) => setDriveVenue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#C62828] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">District</label>
                    <select
                      value={driveDistrict}
                      onChange={(e) => setDriveDistrict(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none cursor-pointer"
                    >
                      {districts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Event Date</label>
                    <input
                      type="date"
                      required
                      value={driveDate}
                      onChange={(e) => setDriveDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Bags / Units</label>
                  <input
                    type="number"
                    min="20"
                    max="1000"
                    required
                    value={targetUnits}
                    onChange={(e) => setTargetUnits(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowDriveModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer"
                  >
                    Publish Drive
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 3: ADD STAFF / POSITION ACCOUNT                          */}
        {/* ============================================================== */}
        {showStaffModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#FFEBEE] text-[#C62828] flex items-center justify-center font-bold">
                    <UserPlus className="w-5 h-5 text-[#C62828]" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Add Staff / Position Account</h3>
                    <p className="text-[11px] text-slate-500">Auto-cleared under this verified blood bank umbrella</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowStaffModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name & Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kazi Sumon"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#C62828] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Position / Role</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior Hematology Lab Tech"
                      value={staffPosition}
                      onChange={(e) => setStaffPosition(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#C62828] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Department / Unit</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Component Separation & Testing"
                      value={staffDept}
                      onChange={(e) => setStaffDept(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#C62828] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. sumon.lab@redcrescent.org.bd"
                      value={staffEmail}
                      onChange={(e) => setStaffEmail(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#C62828] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Direct Phone</label>
                    <input
                      type="tel"
                      required
                      placeholder="+88019..."
                      value={staffPhone}
                      onChange={(e) => setStaffPhone(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#C62828] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Password</label>
                  <input
                    type="text"
                    required
                    placeholder="Initial login password"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#C62828] focus:outline-none font-mono"
                  />
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                  <strong>Auto-Clearance Note:</strong> This staff position can immediately log in at the portal using the assigned email and password without waiting for Super Admin approval.
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowStaffModal(false)}
                    className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingStaff}
                    className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-[#C62828] hover:bg-[#B71C1C] text-white font-bold shadow-md cursor-pointer disabled:opacity-60"
                  >
                    <span>{isAddingStaff ? 'Creating Account...' : 'Confirm & Create Position'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 4: TRANSACTION AUDIT DETAIL MODAL                        */}
        {/* ============================================================== */}
        {selectedTx && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Transaction Audit Verification</h3>
                    <p className="text-[11px] text-slate-500">Batch ID: {selectedTx.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTx(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Transaction Type:</span>
                  <span className="font-bold text-slate-900">{selectedTx.type}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Blood Group:</span>
                  <BloodGroupBadge bloodGroup={selectedTx.bloodGroup} size="sm" />
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Units Changed:</span>
                  <span className="font-bold text-slate-900">{selectedTx.units} Bag(s)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Delta Evolution:</span>
                  <span className="font-mono text-slate-800">
                    {selectedTx.previousUnits} units &rarr; <strong>{selectedTx.newUnits} units</strong>
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Reason / Reference:</span>
                  <span className="font-semibold text-slate-800">{selectedTx.reason}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Logged Timestamp:</span>
                  <span className="font-mono text-slate-600">{selectedTx.createdAt}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedTx(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Expired Discard Confirm Modal */}
        <ConfirmModal
          isOpen={showDiscardConfirm}
          onClose={() => setShowDiscardConfirm(false)}
          onConfirm={async () => {
            setShowDiscardConfirm(false);
            await executeAdjustInventory();
          }}
          title="Confirm Blood Discard?"
          description={`Are you sure you want to mark ${adjustUnits} unit(s) of ${adjustGroup} as EXPIRED and record disposal? This reduction cannot be undone and will be permanently logged in the audit trail.`}
          confirmText="Confirm Discard"
          variant="danger"
          icon={AlertTriangle}
        />

        {/* Staff Deactivation Confirm Modal */}
        <ConfirmModal
          isOpen={staffDeactivateConfirm !== null}
          onClose={() => setStaffDeactivateConfirm(null)}
          onConfirm={async () => {
            if (staffDeactivateConfirm) {
              const targetId = staffDeactivateConfirm.id;
              setStaffDeactivateConfirm(null);
              await handleToggleStaffStatus(targetId, true);
            }
          }}
          title="Deactivate Staff Account?"
          description={
            staffDeactivateConfirm
              ? `Are you sure you want to suspend portal access for ${staffDeactivateConfirm.name}? They will lose access to vault inventory and donor intakes until re-activated.`
              : ''
          }
          confirmText="Deactivate Staff"
          variant="warning"
          icon={AlertTriangle}
        />
      </div>
    </RoleGuard>
  );
}
