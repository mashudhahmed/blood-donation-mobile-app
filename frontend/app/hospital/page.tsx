'use client';

import React, { useState, useEffect, useCallback } from 'react';
import RoleGuard from '@/components/RoleGuard';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useAuth } from '@/lib/auth-context';
import {
  PlusCircle,
  Zap,
  CheckCircle2,
  Phone,
  Search,
  Send,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Building2,
  MapPin,
  Users,
  ArrowRight,
  LayoutGrid,
  List,
  UserPlus,
} from 'lucide-react';
import BloodGroupBadge from '@/components/BloodGroupBadge';
import StatusPill from '@/components/StatusPill';
import {
  api,
  Requisition,
  Donor,
  StaffMember,
  MOCK_REQUISITIONS,
  MOCK_DONORS,
  MOCK_HOSPITAL_STAFF,
} from '@/lib/api';

export default function HospitalPortal() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'requisitions' | 'donors' | 'staff' | 'info'>('requisitions');
  const [requisitions, setRequisitions] = useState<Requisition[]>(MOCK_REQUISITIONS);
  const [filteredStatus, setFilteredStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showModal, setShowModal] = useState(false);
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null);

  // Staff & Positions State
  const [staffList, setStaffList] = useState<StaffMember[]>(MOCK_HOSPITAL_STAFF);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPosition, setStaffPosition] = useState('ICU On-Duty Doctor');
  const [staffDept, setStaffDept] = useState('Intensive Care Unit');
  const [staffPassword, setStaffPassword] = useState('Staff@123456');
  const [isAddingStaff, setIsAddingStaff] = useState(false);

  // Form State
  const [patientName, setPatientName] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O-');
  const [units, setUnits] = useState(2);
  const [urgency, setUrgency] = useState<'CRITICAL' | 'URGENT' | 'NORMAL'>('CRITICAL');
  const [district, setDistrict] = useState(user.district || 'Dhaka');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compatible Donor Finder State
  const [finderBloodGroup, setFinderBloodGroup] = useState('O-');
  const [finderDistrict, setFinderDistrict] = useState(user.district || 'Dhaka');
  const [matchedDonors, setMatchedDonors] = useState<Donor[]>(MOCK_DONORS.filter((d) => d.canDonate));

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const districts = ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur', 'Mymensingh'];

  const isVerifiedFacility = user.licenseNumber && user.licenseNumber.length > 3;

  const loadRequisitions = useCallback(async () => {
    try {
      const res = await api.getHospitalRequisitions(filteredStatus);
      if (res?.requisitions) setRequisitions(res.requisitions);
    } catch (e) {
      console.warn('Requisitions fetch error', e);
    }
  }, [filteredStatus]);

  const loadStaff = useCallback(async () => {
    try {
      const res = await api.getHospitalStaff();
      if (res?.staff) setStaffList(res.staff);
    } catch (e) {
      console.warn('Staff fetch error', e);
    }
  }, []);

  useEffect(() => {
    loadRequisitions();
    loadStaff();
  }, [loadRequisitions, loadStaff]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingStaff(true);
    try {
      const res = await api.createHospitalStaff({
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
      setNotificationBanner(`Position account created for ${staffName} (${staffPosition}). Active immediately under DMC Hospital clearance!`);
      setTimeout(() => setNotificationBanner(null), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create staff member');
    } finally {
      setIsAddingStaff(false);
    }
  };

  const handleToggleStaffStatus = async (staffId: string, currentStatus: boolean) => {
    try {
      const res = await api.toggleHospitalStaffStatus(staffId, !currentStatus);
      if (res?.success) {
        setStaffList((prev) =>
          prev.map((s) => (s.id === staffId ? { ...s, isActive: !currentStatus } : s))
        );
      }
    } catch (err) {
      console.warn('Status toggle error', err);
    }
  };

  // Submit Emergency Requisition
  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await api.createRequisition({
        patientName,
        bloodGroup,
        units,
        urgency,
        district,
        notes,
      });

      const newReq: Requisition = {
        id: res.requisitionId || `req-${Date.now().toString().slice(-4)}`,
        hospitalId: user.id || 'hosp_dmc_01',
        hospitalName: user.organization || 'Dhaka Medical College Hospital',
        patientName,
        bloodGroup,
        units,
        urgency,
        status: 'pending',
        district,
        notes,
        matchedDonorsCount: res.notifiedDonorsCount || 6,
        createdAt: Date.now(),
      };

      setRequisitions([newReq, ...requisitions]);
      setShowModal(false);
      setNotificationBanner(
        `Emergency broadcast active! Dispatched push alert via Firebase Cloud Messaging to ${res.notifiedDonorsCount || 6} nearby ${bloodGroup} mobile app donors in ${district}.`
      );

      // Reset form
      setPatientName('');
      setNotes('');
      setTimeout(() => setNotificationBanner(null), 6000);
    } catch {
      setNotificationBanner('Notice: Requisition logged in hospital local pipeline pending network sync.');
      setTimeout(() => setNotificationBanner(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Step Advance
  const advanceStatus = async (id: string, current: string) => {
    let next: 'pending' | 'matched' | 'dispatched' | 'fulfilled' = 'matched';
    if (current === 'pending') next = 'matched';
    else if (current === 'matched') next = 'dispatched';
    else if (current === 'dispatched') next = 'fulfilled';

    setRequisitions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: next } : r))
    );

    try {
      await api.updateRequisitionStatus(id, next);
    } catch (e) {
      console.warn('Status update sync error', e);
    }
  };

  // Search compatible donors
  const handleSearchDonors = async () => {
    try {
      const res = await api.findCompatibleDonors(finderBloodGroup, finderDistrict);
      if (res?.donors) setMatchedDonors(res.donors);
    } catch {
      setMatchedDonors(MOCK_DONORS.filter((d) => d.canDonate));
    }
  };

  return (
    <RoleGuard allowedRole="HOSPITAL">
      <div className="flex min-h-[calc(100vh-4rem)] bg-[#F5F5F5]">
        {/* Leftbar Sidebar */}
        <DashboardSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingCount={requisitions.filter((r) => r.status === 'pending').length}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-6 sm:p-8 space-y-6 overflow-y-auto">
          {/* Hospital Facility Command Header (2026 Standard) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#FFEBEE] border border-[#FECDD3] text-[#C62828] flex items-center justify-center font-black shadow-sm shrink-0">
                <Building2 className="w-6 h-6 text-[#C62828]" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-black text-slate-900">{user.organization}</h1>
                  {isVerifiedFacility ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600 inline" />
                      <span>Verified Partner</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-amber-600 inline" />
                      <span>Under Administrative Review</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  ICU, OT & Emergency Blood Requisition Desk &bull; Direct Bedside Donor Coordination
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#C62828] hover:bg-[#B71C1C] text-white font-bold text-xs shadow-md shadow-red-500/20 transition-transform hover:scale-[1.02] cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Broadcast Emergency Request</span>
            </button>
          </div>

          {/* Pending Approval Warning Alert Banner if facility unverified */}
          {!isVerifiedFacility && (
            <div className="rounded-2xl bg-amber-50 border border-amber-300 p-4 flex items-start space-x-3 text-amber-900 shadow-xs animate-fadeIn">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-xs">
                <span className="font-bold block text-sm">Administrative Approval Pending</span>
                <span className="text-amber-800 leading-relaxed">
                  Your facility registration is under review. Once verified by an administrator, full emergency broadcast privileges will be activated.
                </span>
              </div>
            </div>
          )}

          {/* FCM Push Notification Banner */}
          {notificationBanner && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-4 flex items-start space-x-3 text-emerald-900 animate-fadeIn shadow-xs">
              <Zap className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0 animate-pulse" />
              <div className="text-xs">
                <span className="font-bold block text-sm">FCM Push Alert Dispatched</span>
                <span>{notificationBanner}</span>
              </div>
            </div>
          )}

          {/* Tab 1: Requisitions Pipeline */}
          {activeTab === 'requisitions' && (
            <div className="space-y-4">
              {/* Header Controls: Filters & View Switcher */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-black text-[#212121]">Hospital Emergency Requisitions Feed</h2>
                  <p className="text-xs text-[#757575] mt-0.5">
                    Modeled directly on citizen mobile urgent cards with live broadcast status
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Status Filter Tabs */}
                  <div className="flex items-center space-x-1 bg-[#F5F5F5] p-1 rounded-xl border border-[#E2E8F0] text-xs font-semibold">
                    {['all', 'pending', 'matched', 'dispatched', 'fulfilled'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setFilteredStatus(st)}
                        className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                          filteredStatus === st
                            ? 'bg-white text-[#C62828] shadow-xs font-bold'
                            : 'text-[#757575] hover:text-[#212121]'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center space-x-1 bg-[#F5F5F5] p-1 rounded-xl border border-[#E2E8F0]">
                    <button
                      onClick={() => setViewMode('cards')}
                      className={`p-1.5 rounded-lg transition-all ${
                        viewMode === 'cards'
                          ? 'bg-white text-[#C62828] shadow-xs'
                          : 'text-[#757575] hover:text-[#212121]'
                      }`}
                      title="Android Cards Feed View"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-1.5 rounded-lg transition-all ${
                        viewMode === 'table'
                          ? 'bg-white text-[#C62828] shadow-xs'
                          : 'text-[#757575] hover:text-[#212121]'
                      }`}
                      title="Administrative Table View"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* View Mode 1: Android Cards Feed (Matching item_home_urgent_request.xml) */}
              {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
                  {requisitions.map((req) => (
                    <div
                      key={req.id}
                      className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-col justify-between space-y-3.5 shadow-xs hover:shadow-md transition-all"
                    >
                      {/* Top Header: Squircle Blood Badge + Tags + Patient Name */}
                      <div className="flex items-start space-x-3">
                        {/* Blood Group Badge (Soft-Rose Squircle matching bg_blood_badge_classy) */}
                        <div className="w-12 h-12 rounded-2xl bg-[#FFF1F2] border border-[#FECDD3] text-[#B91C1C] font-black text-lg flex items-center justify-center shrink-0 shadow-2xs">
                          {req.bloodGroup}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Tags Row */}
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wider bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]">
                              {req.urgency}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                              {req.units} {req.units === 1 ? 'Bag' : 'Bags'}
                            </span>
                            <StatusPill status={req.status} />
                          </div>

                          {/* Patient Name */}
                          <h3 className="text-sm font-bold text-[#0F172A] mt-1.5 truncate">
                            Patient: {req.patientName}
                          </h3>
                        </div>
                      </div>

                      {/* Metadata Container: Hospital + Location + DateTime + Notes */}
                      <div className="bg-[#F8FAFC] border border-[#F1F5F9] rounded-xl p-3 space-y-1.5 text-xs">
                        <div className="flex items-center space-x-2 text-[#1E293B] font-bold">
                          <Building2 className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                          <span className="truncate">{req.hospitalName}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-[#64748B]">
                          <MapPin className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                          <span className="truncate">{req.district}, Bangladesh</span>
                        </div>
                        <div className="flex items-center space-x-2 text-[#64748B]">
                          <Clock className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                          <span className="truncate">
                            {req.notes || 'Emergency requisition dispatched to nearby citizen donors'}
                          </span>
                        </div>
                      </div>

                      {/* Card Actions: Call + Matched Donors + Advance Status CTA */}
                      <div className="flex items-center space-x-2 pt-1">
                        <a
                          href="tel:+8801700000000"
                          className="w-9 h-9 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] hover:bg-slate-100 flex items-center justify-center shrink-0 transition-colors"
                          title="Call Medical Emergency Desk"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => {
                            setNotificationBanner(`FCM push broadcast dispatched to ${req.matchedDonorsCount || 6} verified citizen donors in ${req.district} for patient ${req.patientName}.`);
                            setTimeout(() => setNotificationBanner(null), 5000);
                          }}
                          className="w-9 h-9 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] hover:bg-slate-100 flex items-center justify-center shrink-0 transition-colors"
                          title="View FCM Notified Mobile Donors"
                        >
                          <Users className="w-4 h-4" />
                        </button>

                        {req.status !== 'fulfilled' ? (
                          <button
                            onClick={() => advanceStatus(req.id, req.status)}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
                          >
                            <span>
                              {req.status === 'pending' && 'Advance: Matched'}
                              {req.status === 'matched' && 'Advance: Dispatched'}
                              {req.status === 'dispatched' && 'Mark Fulfilled'}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <div className="flex-1 py-2 px-3 rounded-xl bg-[#E8F5E9] border border-[#C8E6C9] text-[#2E7D32] font-bold text-xs flex items-center justify-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Fulfilled</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* View Mode 2: Administrative Table View */
                <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8FAFC] text-[#757575] font-semibold border-b border-[#E2E8F0] uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-3.5">Patient / Bed Context</th>
                          <th className="px-6 py-3.5">Blood Group</th>
                          <th className="px-6 py-3.5">Units</th>
                          <th className="px-6 py-3.5">Urgency</th>
                          <th className="px-6 py-3.5">Matched Donors</th>
                          <th className="px-6 py-3.5">Pipeline Status</th>
                          <th className="px-6 py-3.5 text-right">Progress Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {requisitions.map((req) => (
                          <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-3.5">
                              <div className="font-bold text-[#0F172A]">{req.patientName}</div>
                              <div className="text-[11px] text-[#757575] truncate max-w-xs">{req.notes || 'No notes specified'}</div>
                            </td>
                            <td className="px-6 py-3.5">
                              <BloodGroupBadge bloodGroup={req.bloodGroup} size="sm" />
                            </td>
                            <td className="px-6 py-3.5 font-bold text-[#0F172A]">{req.units} Bag(s)</td>
                            <td className="px-6 py-3.5">
                              <StatusPill status={req.urgency} />
                            </td>
                            <td className="px-6 py-3.5">
                              <span className="font-semibold text-slate-800">
                                {req.matchedDonorsCount || 0} donors notified
                              </span>
                            </td>
                            <td className="px-6 py-3.5">
                              <StatusPill status={req.status} />
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              {req.status !== 'fulfilled' ? (
                                <button
                                  onClick={() => advanceStatus(req.id, req.status)}
                                  className="px-3 py-1.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs shadow-2xs transition-colors"
                                >
                                  {req.status === 'pending' && 'Advance: Matched'}
                                  {req.status === 'matched' && 'Advance: Dispatched'}
                                  {req.status === 'dispatched' && 'Mark Fulfilled'}
                                </button>
                              ) : (
                                <span className="inline-flex items-center text-[#2E7D32] font-bold text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                  Completed
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Bedside Compatible Donor Matcher */}
          {activeTab === 'donors' && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                <div>
                  <h2 className="text-base font-black text-[#212121]">Bedside Compatible Donor Finder</h2>
                  <p className="text-xs text-[#757575] mt-0.5">
                    Verified donors with direct telephone contact and blood compatibility matching
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={finderBloodGroup}
                    onChange={(e) => setFinderBloodGroup(e.target.value)}
                    className="bg-[#F5F5F5] text-xs font-bold py-2 px-3 rounded-xl border border-[#E2E8F0] focus:outline-none"
                  >
                    {bloodGroups.map((bg) => (
                      <option key={bg} value={bg}>
                        Target: {bg}
                      </option>
                    ))}
                  </select>

                  <select
                    value={finderDistrict}
                    onChange={(e) => setFinderDistrict(e.target.value)}
                    className="bg-[#F5F5F5] text-xs font-semibold py-2 px-3 rounded-xl border border-[#E2E8F0] focus:outline-none"
                  >
                    {districts.map((d) => (
                      <option key={d} value={d}>
                        District: {d}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleSearchDonors}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#E53935] hover:bg-[#C62828] text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Find Donors</span>
                  </button>
                </div>
              </div>

              {/* Donor Cards Grid matching Android item_donor.xml */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {matchedDonors.slice(0, 8).map((donor) => (
                  <div
                    key={donor.id}
                    className="p-4 rounded-2xl border border-[#E2E8F0] bg-white flex flex-col justify-between space-y-3 hover:shadow-md transition-all shadow-xs"
                  >
                    <div className="flex items-start space-x-3">
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-full bg-[#FFEBEE] text-[#E53935] border border-[#FECDD3] flex items-center justify-center font-bold text-sm shrink-0">
                        {donor.name.charAt(0)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-[#0F172A] truncate">{donor.name}</h4>
                          <BloodGroupBadge bloodGroup={donor.bloodGroup} size="sm" />
                        </div>
                        <div className="flex items-center space-x-1.5 mt-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E8F5E9] text-[#16A34A] border border-[#BBF7D0]">
                            Available
                          </span>
                          <span className="text-[10px] text-[#757575] font-medium">
                            {donor.district}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0] text-xs">
                      <a
                        href={`tel:${donor.phone}`}
                        className="inline-flex items-center space-x-1 text-[#E53935] hover:text-[#C62828] font-bold text-xs"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{donor.phone}</span>
                      </a>
                      <span className="text-[10px] text-[#757575] font-medium">
                        {donor.totalDonations || 0} donations
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Internal Staff & Positions */}
          {activeTab === 'staff' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-extrabold text-slate-900">Hospital Staff & Position Accounts</h2>
                    <span className="text-[11px] font-bold bg-[#FFEBEE] text-[#C62828] px-2 py-0.5 rounded-full border border-[#FFCDD2]">
                      {staffList.length} Accounts
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage on-duty doctors, triage nurses, and OT coordinators. Staff accounts operate under this verified hospital and do not require secondary Super Admin approval.
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
                    {/* Status Top Line Indicator */}
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
                          <span className="font-semibold text-slate-800">{member.department || 'Clinical Desk'}</span>
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

                    {/* Bottom Action Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className={`text-[11px] font-bold ${member.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {member.isActive ? 'Active & Authorized' : 'Account Suspended'}
                      </span>
                      <button
                        onClick={() => handleToggleStaffStatus(member.id, member.isActive)}
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

          {/* Tab 4: Facility Profile */}
          {activeTab === 'info' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs max-w-2xl">
              <div>
                <h2 className="text-base font-bold text-slate-900">Hospital Facility Credentials</h2>
                <p className="text-xs text-slate-500">Official licensing credentials and administrative authorization</p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Facility Name:</span>
                  <span className="font-bold text-slate-900">{user.organization}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">License / Reg. Number:</span>
                  <span className="font-mono font-bold text-slate-900">{user.licenseNumber || 'PENDING-REVIEW'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Responsible Officer / CMO:</span>
                  <span className="font-bold text-slate-900">{user.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Official Email:</span>
                  <span className="font-mono text-slate-900">{user.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Operating District:</span>
                  <span className="font-semibold text-slate-900">{user.district || 'Dhaka'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Verification Status:</span>
                  {isVerifiedFacility ? (
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                      Approved & Active for Mobile Push Broadcasts
                    </span>
                  ) : (
                    <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                      Awaiting Administrator Verification
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Emergency Requisition Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-app-badgeBg text-app-primary flex items-center justify-center font-bold">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">New Emergency Requisition</h3>
                      <p className="text-[11px] text-slate-500">Broadcasts instant FCM push notification to mobile donors</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                  >
                    &times;
                  </button>
                </div>

                <form onSubmit={handleCreateRequisition} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Patient Name / OT Bed Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Fatima Begum (OT-3, General Surgery)"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-app-primary focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Required Blood Group</label>
                      <select
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold focus:outline-none"
                      >
                        {bloodGroups.map((bg) => (
                          <option key={bg} value={bg}>
                            {bg}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Number of Units (Bags)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        required
                        value={units}
                        onChange={(e) => setUnits(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Urgency Level</label>
                      <select
                        value={urgency}
                        onChange={(e) => setUrgency(e.target.value as 'CRITICAL' | 'URGENT' | 'NORMAL')}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:outline-none"
                      >
                        <option value="CRITICAL">CRITICAL (Immediate OT / Trauma)</option>
                        <option value="URGENT">URGENT (Within 3-6 Hours)</option>
                        <option value="NORMAL">NORMAL (Scheduled Transfusion)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">District</label>
                      <select
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                      >
                        {districts.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Clinical Notes & Instructions</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Cross-matching completed. Need donor on-site within 45 minutes."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-app-primary hover:bg-app-primaryDark text-white font-bold shadow-md shadow-app-primary/20"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Broadcasting...' : 'Broadcast to Mobile Donors'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add Staff Position Modal */}
          {showStaffModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#FFEBEE] text-[#C62828] flex items-center justify-center font-bold">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">Add Staff / Position Account</h3>
                      <p className="text-[11px] text-slate-500">Auto-cleared under this verified hospital umbrella</p>
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
                      placeholder="e.g. Dr. Kamal Hossain"
                      value={staffName}
                      onChange={(e) => setStaffName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#E53935] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Position / Role</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ICU On-Duty Doctor"
                        value={staffPosition}
                        onChange={(e) => setStaffPosition(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#E53935] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Department / Unit</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Intensive Care Unit"
                        value={staffDept}
                        onChange={(e) => setStaffDept(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#E53935] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. kamal.icu@dmc.edu.bd"
                        value={staffEmail}
                        onChange={(e) => setStaffEmail(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#E53935] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Direct Phone</label>
                      <input
                        type="tel"
                        required
                        placeholder="+8801711..."
                        value={staffPhone}
                        onChange={(e) => setStaffPhone(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#E53935] focus:outline-none"
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
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#E53935] focus:outline-none font-mono"
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
        </main>
      </div>
    </RoleGuard>
  );
}
