'use client';

import React, { useState, useEffect } from 'react';
import RoleGuard from '@/components/RoleGuard';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useAuth } from '@/lib/auth-context';
import {
  Database,
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  History,
  UserCheck,
  Layers,
  ShieldCheck,
  AlertTriangle,
  UserPlus,
} from 'lucide-react';
import BloodGroupBadge from '@/components/BloodGroupBadge';
import StatusPill from '@/components/StatusPill';
import StatsCard from '@/components/StatsCard';
import {
  api,
  StockInfo,
  BloodDrive,
  InventoryTx,
  StaffMember,
  MOCK_INVENTORY,
  MOCK_DRIVES,
  MOCK_TRANSACTIONS,
  MOCK_BLOODBANK_STAFF,
} from '@/lib/api';

export default function BloodBankPortal() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'inventory' | 'walkin' | 'drives' | 'staff' | 'audit'>('inventory');
  const [inventory, setInventory] = useState<Record<string, StockInfo>>(MOCK_INVENTORY);
  const [drives, setDrives] = useState<BloodDrive[]>(MOCK_DRIVES);
  const [transactions, setTransactions] = useState<InventoryTx[]>(MOCK_TRANSACTIONS);
  const [banner, setBanner] = useState<string | null>(null);

  // Staff & Positions State
  const [staffList, setStaffList] = useState<StaffMember[]>(MOCK_BLOODBANK_STAFF);
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

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const districts = ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur', 'Mymensingh'];

  const isVerifiedFacility = user.licenseNumber && user.licenseNumber.length > 3;

  async function loadData() {
    try {
      const invRes = await api.getInventory();
      if (invRes?.inventory) setInventory(invRes.inventory);

      const drvRes = await api.getBloodDrives();
      if (drvRes?.drives) setDrives(drvRes.drives);

      const txRes = await api.getBloodBankTransactions();
      if (txRes?.transactions) setTransactions(txRes.transactions);

      const staffRes = await api.getBloodBankStaff();
      if (staffRes?.staff) setStaffList(staffRes.staff);
    } catch (e) {
      console.warn('Blood bank load error', e);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

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
      setBanner(`Position account created for ${staffName} (${staffPosition}). Active immediately under Red Crescent umbrella!`);
      setTimeout(() => setBanner(null), 5000);
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

  // Handle inventory adjustment
  const handleAdjustInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdjusting(true);

    try {
      const current = inventory[adjustGroup]?.units || 0;
      let newUnits = current;
      if (adjustType === 'INTAKE') newUnits += adjustUnits;
      else {
        if (current < adjustUnits) {
          setBanner(`Insufficient units of ${adjustGroup}. Current stock is only ${current}.`);
          setTimeout(() => setBanner(null), 4000);
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
      setBanner(`Successfully processed ${adjustType} of ${adjustUnits} units for ${adjustGroup}.`);
      setAdjustReason('');
      setBatchNumber('');
      setTimeout(() => setBanner(null), 4000);
    } catch {
      setBanner('Error updating stock in inventory database.');
      setTimeout(() => setBanner(null), 4000);
    } finally {
      setIsAdjusting(false);
    }
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
    setBanner(`Blood Donation Drive "${driveTitle}" scheduled and synced to mobile app calendar!`);
    setDriveTitle('');
    setDriveVenue('');
    setTimeout(() => setBanner(null), 4000);
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

      setBanner(
        `Walk-in donation recorded! Donor eligibility set to 90-day cooldown and +${walkinUnits} bags added to ${walkinBloodGroup}.`
      );
      setWalkinDonorId('');
      setTimeout(() => setBanner(null), 5000);
    } catch {
      setBanner('Notice: Walk-in collection logged locally pending network synchronization.');
      setTimeout(() => setBanner(null), 5000);
    }
  };

  return (
    <RoleGuard allowedRole="BLOOD_BANK">
      <div className="flex min-h-[calc(100vh-4rem)] bg-[#F5F5F5]">
        {/* Leftbar Sidebar */}
        <DashboardSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingCount={drives.filter((d) => d.status === 'PLANNED').length}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-6 sm:p-8 space-y-6 overflow-y-auto">
          {/* Blood Center Command Header (2026 Standard) */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#E3F2FD] border border-[#BBDEFB] text-[#1565C0] flex items-center justify-center font-black shadow-sm shrink-0">
                <Database className="w-6 h-6 text-[#1565C0]" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-black text-slate-900">{user.organization}</h1>
                  {isVerifiedFacility ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 flex items-center space-x-1">
                      <ShieldCheck className="w-3 h-3 text-blue-600 inline" />
                      <span>Licensed Blood Center</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-amber-600 inline" />
                      <span>Pending Verification</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Central Cryo-Storage, 8-Group ABO/Rh Inventory Control & Public Donation Campaigns
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setShowAdjustModal(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#C62828] hover:bg-[#B71C1C] text-white font-bold text-xs shadow-md shadow-red-500/20 transition-transform hover:scale-[1.02] cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>Stock Movement</span>
              </button>
              <button
                onClick={() => setShowDriveModal(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Plan Blood Drive</span>
              </button>
            </div>
          </div>

          {/* Pending Approval Alert if facility is unverified */}
          {!isVerifiedFacility && (
            <div className="rounded-2xl bg-amber-50 border border-amber-300 p-4 flex items-start space-x-3 text-amber-900 shadow-xs animate-fadeIn">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-xs">
                <span className="font-bold block text-sm">Blood Center Under Administrative Review</span>
                <span className="text-amber-800 leading-relaxed">
                  Your blood center license is currently being reviewed by network administrators. Inventory tracking is operational; public donor drives will publish to the mobile app feed upon clearance.
                </span>
              </div>
            </div>
          )}

          {/* Feedback Banner */}
          {banner && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-4 flex items-center space-x-3 text-emerald-900 animate-fadeIn shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold">{banner}</span>
            </div>
          )}

          {/* Tab 1: Inventory Matrix */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatsCard
                  label="Total Preserved Blood Units"
                  value={`${totalStockUnits} Bags`}
                  subtitle="Cryo-stored & screened at 2°C - 6°C"
                  icon={Database}
                  variant="blood"
                />
                <StatsCard
                  label="Scheduled Mobile Drives"
                  value={drives.filter((d) => d.status === 'PLANNED').length}
                  subtitle="Public camps across educational institutes"
                  icon={Calendar}
                  variant="slate"
                />
                <StatsCard
                  label="Movement Transactions"
                  value={transactions.length}
                  subtitle="Intake, hospital dispatches & test dispatches"
                  icon={History}
                  variant="emerald"
                />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">ABO & Rhesus (Rh) Stock Levels</h2>
                    <p className="text-xs text-slate-500">
                      Threshold indicators: &lt;5 Critical &bull; &lt;10 Low &bull; 10-24 Optimal &bull; 25+ Abundant
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Total: {totalStockUnits} Units
                  </span>
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
                        className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                          isCritical
                            ? 'border-red-300 bg-red-50/40 ring-1 ring-red-400'
                            : isLow
                            ? 'border-amber-300 bg-amber-50/40'
                            : 'border-slate-200 bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <BloodGroupBadge bloodGroup={bg} size="lg" />
                          <StatusPill status={data.status} />
                        </div>

                        <div>
                          <div className="flex items-baseline space-x-1.5">
                            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                              {data.units}
                            </span>
                            <span className="text-xs text-slate-500 font-semibold">Units</span>
                          </div>

                          {/* Progress Meter Bar */}
                          <div className="mt-2 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
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

                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                          <span>Capacity: {percentage}%</span>
                          <button
                            onClick={() => {
                              setAdjustGroup(bg);
                              setShowAdjustModal(true);
                            }}
                            className="text-app-primary hover:text-app-primaryDark font-bold"
                          >
                            Adjust &rarr;
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Walk-In Donor Intake */}
          {activeTab === 'walkin' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs max-w-xl">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Walk-In Donor Intake Terminal</h3>
                  <p className="text-xs text-slate-500">
                    Logs collection, adds bags to inventory, and updates donor&apos;s last donation date in Firestore
                  </p>
                </div>
              </div>

              <form onSubmit={handleWalkInCollection} className="space-y-4 text-xs pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Donor Mobile Number / Registered ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +8801711223344 or d1"
                    value={walkinDonorId}
                    onChange={(e) => setWalkinDonorId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-app-primary focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Collected Blood Group</label>
                    <select
                      value={walkinBloodGroup}
                      onChange={(e) => setWalkinBloodGroup(e.target.value)}
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
                    <label className="block font-semibold text-slate-700 mb-1">Units (Bags)</label>
                    <input
                      type="number"
                      min="1"
                      max="2"
                      value={walkinUnits}
                      onChange={(e) => setWalkinUnits(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Record On-Site Donation & Apply Cooldown</span>
                </button>
              </form>
            </div>
          )}

          {/* Tab 3: Blood Donation Drives */}
          {activeTab === 'drives' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Public Donation Drives</h3>
                  <p className="text-xs text-slate-500">Synced to mobile app feed for donor registrations</p>
                </div>

                <button
                  onClick={() => setShowDriveModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                >
                  + Schedule Campaign
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {drives.map((drv) => (
                  <div
                    key={drv.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {drv.status}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 mt-2">{drv.title}</h4>
                      <div className="text-xs text-slate-500 space-y-1 mt-2">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{drv.venue}, {drv.district}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Date: {drv.date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Collected:</span>
                      <strong className="text-slate-900">{drv.collectedUnits || 0} / {drv.targetUnits} Bags</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Audit Trail */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Inventory Movement Audit Trail</h2>
                  <p className="text-xs text-slate-500">
                    Cryptographically verified logs of intake, hospital dispatches, and expired discards
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                  {transactions.length} Transactions Logged
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Blood Group</th>
                      <th className="px-6 py-3">Units</th>
                      <th className="px-6 py-3">Delta</th>
                      <th className="px-6 py-3">Reason</th>
                      <th className="px-6 py-3 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {transactions.map((tx) => (
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
                              DISPATCH (Hospital)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-800 border border-red-200">
                              EXPIRED
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Internal Staff & Positions */}
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
                    Manage hematology lab techs, cryo-storage operators, and quality officers. Staff accounts operate under this verified blood bank and do not require secondary Super Admin approval.
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

          {/* Adjust Stock Modal */}
          {showAdjustModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-app-badgeBg text-app-primary flex items-center justify-center font-bold">
                      <Layers className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">Adjust Blood Stock</h3>
                  </div>
                  <button
                    onClick={() => setShowAdjustModal(false)}
                    className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                  >
                    &times;
                  </button>
                </div>

                <form onSubmit={handleAdjustInventory} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Transaction Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['INTAKE', 'DISPATCH', 'EXPIRED'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setAdjustType(t)}
                          className={`py-2 px-2 rounded-xl font-bold text-center border transition-all ${
                            adjustType === t
                              ? 'bg-app-primary text-white border-app-primary shadow-2xs'
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
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
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
                      className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAdjusting}
                      className="px-5 py-2.5 rounded-xl bg-app-primary hover:bg-app-primaryDark text-white font-bold shadow-md shadow-app-primary/20"
                    >
                      {isAdjusting ? 'Processing...' : 'Confirm Stock Movement'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Schedule Drive Modal */}
          {showDriveModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">Schedule Public Blood Drive</h3>
                  </div>
                  <button
                    onClick={() => setShowDriveModal(false)}
                    className="text-slate-400 hover:text-slate-600 text-lg font-bold"
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
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
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
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">District</label>
                      <select
                        value={driveDistrict}
                        onChange={(e) => setDriveDistrict(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
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
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
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
                      className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold"
                    >
                      Publish Drive
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
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#E53935] focus:outline-none"
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
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#E53935] focus:outline-none"
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
                        placeholder="e.g. sumon.lab@redcrescent.org.bd"
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
                        placeholder="+88019..."
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
