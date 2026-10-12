'use client';

import React, { useState, useEffect, useCallback } from 'react';
import RoleGuard from '@/components/RoleGuard';
import DashboardSidebar from '@/components/DashboardSidebar';
import {
  ShieldCheck,
  Building2,
  Users,
  CheckCircle2,
  Search,
  Filter,
  Flame,
  Phone,
  Clock,
  RefreshCw,
  Shield,
  Check,
  X,
} from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import BloodGroupBadge from '@/components/BloodGroupBadge';
import StatusPill from '@/components/StatusPill';
import {
  api,
  Donor,
  MOCK_ADMIN_METRICS,
  MOCK_DONORS,
  MOCK_HOSPITALS,
  MOCK_INVENTORY,
} from '@/lib/api';

export default function AdminPortal() {
  const [activeTab, setActiveTab] = useState<'overview' | 'verifications' | 'donors' | 'inventory' | 'audit'>('overview');
  const [metrics, setMetrics] = useState(MOCK_ADMIN_METRICS);
  const [hospitals, setHospitals] = useState(MOCK_HOSPITALS);
  const [donors, setDonors] = useState<Donor[]>(MOCK_DONORS);
  const [inventory, setInventory] = useState(MOCK_INVENTORY);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('all');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const bloodGroups = ['all', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const mRes = await api.getAdminMetrics();
      if (mRes?.metrics) setMetrics(mRes.metrics);

      const dRes = await api.getAdminDonors(selectedBloodGroup);
      if (dRes?.donors) setDonors(dRes.donors);

      const invRes = await api.getInventory();
      if (invRes?.inventory) setInventory(invRes.inventory);
    } catch (err) {
      console.warn('Admin fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBloodGroup]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleVerification = async (id: string, currentStatus: boolean) => {
    const updatedStatus = !currentStatus;
    setHospitals((prev) =>
      prev.map((h) => (h.id === id ? { ...h, verified: updatedStatus } : h))
    );

    try {
      await api.verifyOrganization(id, 'hospital', updatedStatus);
      setFeedbackMsg(`Hospital license ${updatedStatus ? 'approved & authorized' : 'revoked'} successfully.`);
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch {
      setFeedbackMsg('Failed to update hospital status in Firestore');
    }
  };

  const pendingCount = hospitals.filter((h) => !h.verified).length;

  const filteredDonors = donors.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.phone.includes(searchQuery);
    const matchesBg = selectedBloodGroup === 'all' || d.bloodGroup === selectedBloodGroup;
    return matchesSearch && matchesBg;
  });

  return (
    <RoleGuard allowedRole="ADMIN">
      <div className="flex min-h-[calc(100vh-4rem)] bg-[#F5F5F5]">
        {/* Production Dashboard Leftbar */}
        <DashboardSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingCount={pendingCount}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-6 sm:p-8 space-y-8 overflow-y-auto">
          {/* Admin Command Header (2026 Standard) */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black shadow-md shadow-slate-900/10 shrink-0">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-black text-slate-900">Admin Command Hub</h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>System Operational</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Facility licensing approvals, citizen donor registry & real-time blood analytics
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {feedbackMsg && (
                <div className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 animate-fadeIn flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{feedbackMsg}</span>
                </div>
              )}
              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Sync Database</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Executive Overview */}
          {(activeTab === 'overview' || activeTab === 'verifications') && (
            <div className="space-y-8">
              {/* KPI Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                  label="Registered Mobile Donors"
                  value={metrics.totalDonors}
                  subtitle={`${metrics.eligibleDonors} eligible donors ready`}
                  icon={Users}
                  variant="blood"
                  trend="+14% this month"
                />
                <StatsCard
                  label="Hospital Facilities"
                  value={metrics.registeredHospitals}
                  subtitle={`${pendingCount} pending administrative verification`}
                  icon={Building2}
                  variant="emerald"
                />
                <StatsCard
                  label="Emergency Broadcasts"
                  value={metrics.activeUrgentRequests}
                  subtitle="Active alerts sent to Android donors"
                  icon={Flame}
                  variant="amber"
                />
                <StatsCard
                  label="National Reserve"
                  value={`${metrics.totalUnitsInNetwork} Bags`}
                  subtitle="Across regional blood bank centers"
                  icon={ShieldCheck}
                  variant="slate"
                />
              </div>

              {/* Hospital & Blood Bank Verification Queue Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Facility Licensing & Administrative Approval Queue
                    </h2>
                    <p className="text-xs text-slate-500">
                      Super Administrator must approve medical licenses to unlock direct FCM push broadcasts to citizen mobile donors
                    </p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    {pendingCount} Awaiting Authorization
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Facility Name</th>
                        <th className="px-6 py-3">District</th>
                        <th className="px-6 py-3">License / Reg No</th>
                        <th className="px-6 py-3">Emergency Phone</th>
                        <th className="px-6 py-3">Verification State</th>
                        <th className="px-6 py-3 text-right">Administrative Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {hospitals.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-3.5 font-bold text-slate-900">{h.name}</td>
                          <td className="px-6 py-3.5">{h.district}</td>
                          <td className="px-6 py-3.5 font-mono text-slate-600 font-semibold">{h.licenseNumber}</td>
                          <td className="px-6 py-3.5 text-slate-600">{h.contactPhone}</td>
                          <td className="px-6 py-3.5">
                            {h.verified ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                                Approved Partner
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3 mr-1 text-amber-600" />
                                Pending Verification
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <button
                              onClick={() => toggleVerification(h.id, h.verified)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 ml-auto ${
                                h.verified
                                  ? 'bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              }`}
                            >
                              {h.verified ? (
                                <>
                                  <X className="w-3.5 h-3.5" />
                                  <span>Revoke Clearance</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve & Authorize</span>
                                </>
                              )}
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

          {/* Tab 2: National Blood Matrix */}
          {(activeTab === 'overview' || activeTab === 'inventory') && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">National Blood Bank Reserve Heatmap</h2>
                  <p className="text-xs text-slate-500">Live units across all 8 ABO/Rh groups in registered bank facilities</p>
                </div>
                <span className="text-xs font-extrabold text-app-primary bg-app-badgeBg px-2.5 py-1 rounded-full border border-app-primary/20">
                  8 Groups Monitored
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {Object.entries(inventory).map(([bg, data]) => (
                  <div
                    key={bg}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center space-y-2 text-center"
                  >
                    <BloodGroupBadge bloodGroup={bg} size="lg" />
                    <div className="text-2xl font-black text-slate-900">{data.units}</div>
                    <StatusPill status={data.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Donor Directory */}
          {(activeTab === 'donors') && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Registered Citizen Donors</h2>
                  <p className="text-xs text-slate-500">
                    Synchronized from Android mobile app registrations
                  </p>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search name, phone, district..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-app-primary w-48 sm:w-64"
                    />
                  </div>

                  <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                    <Filter className="w-3.5 h-3.5 text-slate-500 ml-1" />
                    <select
                      value={selectedBloodGroup}
                      onChange={(e) => setSelectedBloodGroup(e.target.value)}
                      className="bg-white text-xs font-bold py-1 px-2 rounded-md border border-slate-200 focus:outline-none"
                    >
                      {bloodGroups.map((bg) => (
                        <option key={bg} value={bg}>
                          {bg === 'all' ? 'All Blood Groups' : bg}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Donor Name</th>
                      <th className="px-6 py-3">Blood Group</th>
                      <th className="px-6 py-3">Contact</th>
                      <th className="px-6 py-3">District</th>
                      <th className="px-6 py-3">Total Donations</th>
                      <th className="px-6 py-3">Eligibility State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredDonors.map((donor) => (
                      <tr key={donor.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-slate-900">{donor.name}</td>
                        <td className="px-6 py-3.5">
                          <BloodGroupBadge bloodGroup={donor.bloodGroup} size="sm" />
                        </td>
                        <td className="px-6 py-3.5 font-mono text-slate-600 flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{donor.phone}</span>
                        </td>
                        <td className="px-6 py-3.5">{donor.district}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-800">
                          {donor.totalDonations || 0} times
                        </td>
                        <td className="px-6 py-3.5">
                          {donor.canDonate ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Eligible to Donate
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              In 90-Day Cooling Cooldown
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

          {/* Tab 4: Security & Audit Stream */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex items-center space-x-2.5">
                <Shield className="w-5 h-5 text-slate-800" />
                <div>
                  <h2 className="text-base font-bold text-slate-900">Security & Activity Logs</h2>
                  <p className="text-xs text-slate-500">Live operational events recorded in transaction ledger</p>
                </div>
              </div>

              <div className="space-y-3 pt-2 text-xs">
                {[
                  { event: 'Emergency Requisition Broadcasted', facility: 'Dhaka Medical College Hospital', detail: '2 Units O- broadcasted to 8 nearby mobile app donors via FCM', time: '12 minutes ago' },
                  { event: 'Walk-in Collection Logged', facility: 'Red Crescent Blood Center', detail: '1 Unit A+ intake from verified mobile donor (d1)', time: '45 minutes ago' },
                  { event: 'Facility License Verified', facility: 'Sylhet MAG Osmani Medical Hospital', detail: 'Facility clearance approved by Administrator', time: '2 hours ago' },
                  { event: 'Blood Drive Registered', facility: 'Red Crescent Blood Center', detail: 'Public camp scheduled at TSC Dhaka University', time: '1 day ago' },
                ].map((log, i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{log.event} &bull; <span className="text-app-primary">{log.facility}</span></div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{log.detail}</div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </RoleGuard>
  );
}
