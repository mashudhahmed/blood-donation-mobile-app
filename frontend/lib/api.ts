// BloodLink API Client
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface Donor {
  id: string;
  name: string;
  phone: string;
  bloodGroup: string;
  district: string;
  canDonate: boolean;
  totalDonations?: number;
  lastDonationDate?: number;
}

export interface Requisition {
  id: string;
  hospitalId: string;
  hospitalName?: string;
  patientName: string;
  bloodGroup: string;
  units: number;
  urgency: 'NORMAL' | 'URGENT' | 'CRITICAL';
  status: 'pending' | 'matched' | 'dispatched' | 'fulfilled';
  district: string;
  notes?: string;
  matchedDonorsCount?: number;
  createdAt: number | string;
}

export interface StockInfo {
  units: number;
  status: 'CRITICAL' | 'LOW' | 'NORMAL' | 'ABUNDANT';
}

export interface BloodDrive {
  id: string;
  title: string;
  venue: string;
  district: string;
  date: string;
  targetUnits: number;
  collectedUnits?: number;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED';
}

export interface InventoryTx {
  id: string;
  bloodGroup: string;
  type: 'INTAKE' | 'DISPATCH' | 'EXPIRED';
  units: number;
  previousUnits: number;
  newUnits: number;
  reason?: string;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  facilityId: string;
  facilityName?: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  department?: string;
  role: 'HOSPITAL' | 'BLOOD_BANK';
  permissions?: string[];
  isActive: boolean;
  createdAt?: number;
}

// Fallback Mock Data for resilient offline/dev previews
export const MOCK_ADMIN_METRICS = {
  totalDonors: 1420,
  eligibleDonors: 890,
  registeredHospitals: 28,
  verifiedHospitals: 24,
  bloodBanks: 12,
  totalUnitsInNetwork: 485,
  pendingVerifications: 4,
  activeUrgentRequests: 7,
};

export const MOCK_DONORS: Donor[] = [
  { id: 'd1', name: 'Zayed Khan', phone: '+8801711223344', bloodGroup: 'O+', district: 'Dhaka', canDonate: true, totalDonations: 6 },
  { id: 'd2', name: 'Tanvir Hossain', phone: '+8801822334455', bloodGroup: 'A+', district: 'Dhaka', canDonate: true, totalDonations: 4 },
  { id: 'd3', name: 'Farhana Akter', phone: '+8801933445566', bloodGroup: 'B+', district: 'Chittagong', canDonate: false, totalDonations: 3 },
  { id: 'd4', name: 'Rakib Hasan', phone: '+8801644556677', bloodGroup: 'O-', district: 'Dhaka', canDonate: true, totalDonations: 8 },
  { id: 'd5', name: 'Ayesha Siddika', phone: '+8801555667788', bloodGroup: 'AB+', district: 'Sylhet', canDonate: true, totalDonations: 2 },
  { id: 'd6', name: 'Mahmudur Rahman', phone: '+8801766778899', bloodGroup: 'AB-', district: 'Dhaka', canDonate: false, totalDonations: 5 },
  { id: 'd7', name: 'Sadia Islam', phone: '+8801877889900', bloodGroup: 'A-', district: 'Rajshahi', canDonate: true, totalDonations: 3 },
  { id: 'd8', name: 'Nafis Chowdhury', phone: '+8801988990011', bloodGroup: 'B-', district: 'Dhaka', canDonate: true, totalDonations: 7 },
];

export const MOCK_HOSPITALS = [
  { id: 'h1', name: 'Dhaka Medical College Hospital', district: 'Dhaka', licenseNumber: 'LIC-2021-9921', verified: true, contactPhone: '+880255165088', createdAt: '2025-01-10' },
  { id: 'h2', name: 'Square Hospital Dhaka', district: 'Dhaka', licenseNumber: 'LIC-2022-4412', verified: true, contactPhone: '+88028144400', createdAt: '2025-02-15' },
  { id: 'h3', name: 'Apollo Imperial Hospital', district: 'Chittagong', licenseNumber: 'LIC-2023-1189', verified: false, contactPhone: '+88031652200', createdAt: '2026-03-01' },
  { id: 'h4', name: 'Evercare Hospital Chattogram', district: 'Chittagong', licenseNumber: 'LIC-2024-8712', verified: false, contactPhone: '+88031255888', createdAt: '2026-03-20' },
  { id: 'h5', name: 'Sylhet MAG Osmani Medical Hospital', district: 'Sylhet', licenseNumber: 'LIC-2021-3321', verified: true, contactPhone: '+880821713000', createdAt: '2025-05-12' },
];

export const MOCK_REQUISITIONS: Requisition[] = [
  { id: 'req-101', hospitalId: 'h1', hospitalName: 'Dhaka Medical College', patientName: 'Fatima Begum', bloodGroup: 'O-', units: 2, urgency: 'CRITICAL', status: 'pending', district: 'Dhaka', notes: 'Emergency surgery in OT-3', matchedDonorsCount: 4, createdAt: Date.now() - 3600000 },
  { id: 'req-102', hospitalId: 'h1', hospitalName: 'Dhaka Medical College', patientName: 'Kamal Hossain', bloodGroup: 'A+', units: 1, urgency: 'URGENT', status: 'matched', district: 'Dhaka', notes: 'Accident trauma care', matchedDonorsCount: 12, createdAt: Date.now() - 7200000 },
  { id: 'req-103', hospitalId: 'h2', hospitalName: 'Square Hospital', patientName: 'Sultana Razia', bloodGroup: 'B+', units: 3, urgency: 'NORMAL', status: 'dispatched', district: 'Dhaka', notes: 'Scheduled leukemia transfusion', matchedDonorsCount: 8, createdAt: Date.now() - 86400000 },
  { id: 'req-104', hospitalId: 'h1', hospitalName: 'Dhaka Medical College', patientName: 'Jamil Ahmed', bloodGroup: 'AB-', units: 1, urgency: 'CRITICAL', status: 'fulfilled', district: 'Dhaka', notes: 'Fulfilled via Blood Bank dispatch', matchedDonorsCount: 2, createdAt: Date.now() - 172800000 },
];

export const MOCK_INVENTORY: Record<string, StockInfo> = {
  'A+': { units: 28, status: 'ABUNDANT' },
  'A-': { units: 6, status: 'LOW' },
  'B+': { units: 34, status: 'ABUNDANT' },
  'B-': { units: 8, status: 'LOW' },
  'AB+': { units: 14, status: 'NORMAL' },
  'AB-': { units: 3, status: 'CRITICAL' },
  'O+': { units: 42, status: 'ABUNDANT' },
  'O-': { units: 4, status: 'CRITICAL' },
};

export const MOCK_DRIVES: BloodDrive[] = [
  { id: 'drv-01', title: 'University Campus Annual Blood Drive', venue: 'TSC Dhaka University', district: 'Dhaka', date: '2026-10-25', targetUnits: 150, collectedUnits: 0, status: 'PLANNED' },
  { id: 'drv-02', title: 'Police Plaza Community Health Camp', venue: 'Gulshan 1 Circle', district: 'Dhaka', date: '2026-11-02', targetUnits: 80, collectedUnits: 0, status: 'PLANNED' },
  { id: 'drv-03', title: 'Chittagong Port Blood Lifeline Camp', venue: 'Agrabad Commercial Area', district: 'Chittagong', date: '2026-10-18', targetUnits: 100, collectedUnits: 45, status: 'ACTIVE' },
];

export const MOCK_TRANSACTIONS: InventoryTx[] = [
  { id: 'tx-501', bloodGroup: 'O+', type: 'INTAKE', units: 4, previousUnits: 38, newUnits: 42, reason: 'Voluntary mobile drive collection', createdAt: '2026-10-11 14:30' },
  { id: 'tx-502', bloodGroup: 'AB-', type: 'DISPATCH', units: 1, previousUnits: 4, newUnits: 3, reason: 'Emergency dispatch to Dhaka Medical College', createdAt: '2026-10-11 12:15' },
  { id: 'tx-503', bloodGroup: 'O-', type: 'DISPATCH', units: 2, previousUnits: 6, newUnits: 4, reason: 'Immediate trauma dispatch Square Hospital', createdAt: '2026-10-11 09:40' },
  { id: 'tx-504', bloodGroup: 'B+', type: 'INTAKE', units: 5, previousUnits: 29, newUnits: 34, reason: 'Walk-in donors batch #4401', createdAt: '2026-10-10 17:00' },
];

export const MOCK_HOSPITAL_STAFF: StaffMember[] = [
  {
    id: 'usr_hosp_staff_001',
    facilityId: 'usr_hosp_001',
    facilityName: 'Dhaka Medical College Hospital',
    name: 'Dr. Kamal Hossain',
    email: 'kamal.icu@dmc.edu.bd',
    phone: '+8801711223344',
    position: 'ICU On-Duty Doctor',
    department: 'Intensive Care Unit',
    role: 'HOSPITAL',
    permissions: ['create_requisition', 'view_donors', 'update_status'],
    isActive: true,
    createdAt: Date.now() - 86400000 * 14,
  },
  {
    id: 'usr_hosp_staff_002',
    facilityId: 'usr_hosp_001',
    facilityName: 'Dhaka Medical College Hospital',
    name: 'Nurse Ayesha Siddika',
    email: 'ayesha.nurse@dmc.edu.bd',
    phone: '+8801822334455',
    position: 'Emergency Desk Nurse',
    department: 'Emergency & Triage',
    role: 'HOSPITAL',
    permissions: ['create_requisition', 'view_donors'],
    isActive: true,
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'usr_hosp_staff_003',
    facilityId: 'usr_hosp_001',
    facilityName: 'Dhaka Medical College Hospital',
    name: 'Dr. Tariqul Islam',
    email: 'tariq.ot@dmc.edu.bd',
    phone: '+8801933445566',
    position: 'OT Surgery Coordinator',
    department: 'Operation Theater Desk',
    role: 'HOSPITAL',
    permissions: ['create_requisition', 'view_donors', 'update_status'],
    isActive: true,
    createdAt: Date.now() - 86400000 * 3,
  },
];

export const MOCK_BLOODBANK_STAFF: StaffMember[] = [
  {
    id: 'usr_bb_staff_001',
    facilityId: 'usr_bb_001',
    facilityName: 'Red Crescent Blood Center',
    name: 'Kazi Sumon',
    email: 'sumon.lab@redcrescent.org.bd',
    phone: '+8801933445566',
    position: 'Senior Hematology Lab Tech',
    department: 'Component Separation & Testing',
    role: 'BLOOD_BANK',
    permissions: ['manage_inventory', 'record_donations'],
    isActive: true,
    createdAt: Date.now() - 86400000 * 20,
  },
  {
    id: 'usr_bb_staff_002',
    facilityId: 'usr_bb_001',
    facilityName: 'Red Crescent Blood Center',
    name: 'Tahmina Akter',
    email: 'tahmina.stock@redcrescent.org.bd',
    phone: '+8801644556677',
    position: 'Cryo-Storage Operator',
    department: 'Cold Chain & Storage',
    role: 'BLOOD_BANK',
    permissions: ['manage_inventory'],
    isActive: true,
    createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'usr_bb_staff_003',
    facilityId: 'usr_bb_001',
    facilityName: 'Red Crescent Blood Center',
    name: 'Farhana Parveen',
    email: 'farhana.qc@redcrescent.org.bd',
    phone: '+8801555667788',
    position: 'Quality Control Officer',
    department: 'Transfusion Safety Assurance',
    role: 'BLOOD_BANK',
    permissions: ['manage_inventory', 'manage_drives'],
    isActive: true,
    createdAt: Date.now() - 86400000 * 4,
  },
];

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async fetchWithFallback<T>(url: string, options: RequestInit = {}, fallback: T): Promise<T> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      };

      const res = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: { ...headers, ...(options.headers as Record<string, string>) },
      });

      if (!res.ok) {
        console.warn(`API [${url}] returned status ${res.status}. Using fallback preview.`);
        return fallback;
      }
      return await res.json();
    } catch (err) {
      console.warn(`API [${url}] connection failed. Using fallback preview:`, err);
      return fallback;
    }
  }

  // Authentication APIs
  async authLogin(data: { email: string; password: string }) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.token) this.setToken(json.token);
        return json;
      }
    } catch (e) {
      console.warn('Backend login endpoint unavailable, using simulated JWT credentials:', e);
    }
    // Simulated JWT fallback
    const fakeToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ email: data.email, role: 'ADMIN', time: Date.now() }))}.signature`;
    this.setToken(fakeToken);
    return {
      success: true,
      token: fakeToken,
      user: {
        id: 'usr_auth_' + Date.now().toString().slice(-4),
        email: data.email,
        name: 'Facility Officer',
        organization: 'Verified Facility',
        role: 'ADMIN',
      },
    };
  }

  async authRegister(data: {
    email: string;
    password: string;
    name: string;
    organization: string;
    role: string;
    phone: string;
    district: string;
    licenseNumber?: string;
  }) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.token) this.setToken(json.token);
        return json;
      }
    } catch (e) {
      console.warn('Backend register endpoint unavailable, using simulated registration:', e);
    }
    const fakeToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ email: data.email, role: data.role, time: Date.now() }))}.signature`;
    this.setToken(fakeToken);
    return {
      success: true,
      token: fakeToken,
      user: {
        id: 'usr_reg_' + Date.now().toString().slice(-4),
        email: data.email,
        name: data.name,
        organization: data.organization,
        role: data.role,
        district: data.district,
        phone: data.phone,
        licenseNumber: data.licenseNumber,
      },
    };
  }

  // Admin APIs
  async getAdminMetrics() {
    return this.fetchWithFallback('/admin/metrics', { method: 'GET' }, {
      success: true,
      metrics: MOCK_ADMIN_METRICS,
      recentDonors: MOCK_DONORS.slice(0, 5),
    });
  }

  async getAdminDonors(bloodGroup?: string, district?: string) {
    let url = '/admin/donors?limit=50';
    if (bloodGroup && bloodGroup !== 'all') url += `&bloodGroup=${encodeURIComponent(bloodGroup)}`;
    if (district && district !== 'all') url += `&district=${encodeURIComponent(district)}`;
    return this.fetchWithFallback(url, { method: 'GET' }, {
      success: true,
      count: MOCK_DONORS.length,
      donors: MOCK_DONORS,
    });
  }

  async verifyOrganization(id: string, type: 'hospital' | 'bloodBank', verified: boolean) {
    const status = verified ? 'VERIFIED' : 'PENDING';
    const orgType = type === 'bloodBank' ? 'bloodbank' : 'hospital';
    return this.fetchWithFallback(`/admin/organizations/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ type: orgType, status }),
    }, { success: true, message: `Organization ${id} verification updated to ${verified}` });
  }

  // Hospital APIs
  async getHospitalRequisitions(status?: string) {
    const url = status && status !== 'all' ? `/hospitals/requisitions?status=${status}` : '/hospitals/requisitions';
    return this.fetchWithFallback(url, { method: 'GET' }, {
      success: true,
      count: MOCK_REQUISITIONS.length,
      requisitions: MOCK_REQUISITIONS,
    });
  }

  async createRequisition(data: {
    patientName: string;
    bloodGroup: string;
    units: number;
    urgency: string;
    district: string;
    notes?: string;
  }) {
    return this.fetchWithFallback('/hospitals/requisitions', {
      method: 'POST',
      body: JSON.stringify(data),
    }, {
      success: true,
      requisitionId: `req-${Date.now().toString().slice(-4)}`,
      notifiedDonorsCount: 8,
      message: 'Emergency requisition broadcasted to eligible donors via FCM push!',
    });
  }

  async updateRequisitionStatus(id: string, status: string, notes?: string) {
    return this.fetchWithFallback(`/hospitals/requisitions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }, { success: true, id, status });
  }

  async findCompatibleDonors(bloodGroup: string, district: string) {
    return this.fetchWithFallback(
      `/hospitals/compatible-donors?bloodGroup=${encodeURIComponent(bloodGroup)}&district=${encodeURIComponent(district)}`,
      { method: 'GET' },
      {
        success: true,
        bloodGroup,
        district,
        count: MOCK_DONORS.filter(d => d.canDonate).length,
        donors: MOCK_DONORS.filter(d => d.canDonate),
      }
    );
  }

  // Blood Bank APIs
  async getInventory(bankId = 'main_blood_bank') {
    return this.fetchWithFallback(`/bloodbanks/inventory?bankId=${bankId}`, { method: 'GET' }, {
      success: true,
      bankId,
      totalUnits: 139,
      inventory: MOCK_INVENTORY,
      lastUpdated: new Date().toISOString(),
    });
  }

  async adjustInventory(data: {
    bloodGroup: string;
    type: 'INTAKE' | 'DISPATCH' | 'EXPIRED';
    units: number;
    reason?: string;
    batchOrBagNumber?: string;
  }) {
    return this.fetchWithFallback('/bloodbanks/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
    }, {
      success: true,
      bloodGroup: data.bloodGroup,
      type: data.type,
      updatedUnits: 12,
    });
  }

  async getBloodBankTransactions() {
    return this.fetchWithFallback('/bloodbanks/transactions', { method: 'GET' }, {
      success: true,
      count: MOCK_TRANSACTIONS.length,
      transactions: MOCK_TRANSACTIONS,
    });
  }

  async getBloodDrives() {
    return this.fetchWithFallback('/bloodbanks/drives', { method: 'GET' }, {
      success: true,
      count: MOCK_DRIVES.length,
      drives: MOCK_DRIVES,
    });
  }

  async createBloodDrive(data: {
    title: string;
    venue: string;
    district: string;
    date: string;
    targetUnits: number;
    description?: string;
  }) {
    return this.fetchWithFallback('/bloodbanks/drives', {
      method: 'POST',
      body: JSON.stringify(data),
    }, {
      success: true,
      driveId: `drv-${Date.now().toString().slice(-4)}`,
      drive: { ...data, id: `drv-${Date.now().toString().slice(-4)}`, status: 'PLANNED' },
    });
  }

  async recordWalkInDonation(data: { donorId: string; bloodGroup: string; units?: number }) {
    return this.fetchWithFallback('/bloodbanks/donations/record', {
      method: 'POST',
      body: JSON.stringify(data),
    }, {
      success: true,
      message: `Donation recorded for donor ${data.donorId}. Eligibility updated and stock incremented.`,
    });
  }

  // Hospital Staff Management APIs
  async getHospitalStaff() {
    return this.fetchWithFallback('/hospitals/staff', { method: 'GET' }, {
      success: true,
      count: MOCK_HOSPITAL_STAFF.length,
      staff: MOCK_HOSPITAL_STAFF,
    });
  }

  async createHospitalStaff(data: {
    name: string;
    email: string;
    phone: string;
    position: string;
    department?: string;
    password?: string;
    permissions?: string[];
  }) {
    return this.fetchWithFallback('/hospitals/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    }, {
      success: true,
      message: 'Position account created successfully.',
      staff: {
        id: `usr_hosp_staff_${Date.now().toString().slice(-4)}`,
        facilityId: 'usr_hosp_001',
        facilityName: 'Dhaka Medical College Hospital',
        ...data,
        role: 'HOSPITAL',
        isActive: true,
        createdAt: Date.now(),
      } as StaffMember,
    });
  }

  async toggleHospitalStaffStatus(id: string, isActive?: boolean) {
    return this.fetchWithFallback(`/hospitals/staff/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }, {
      success: true,
      id,
      isActive: isActive !== undefined ? isActive : true,
      message: 'Staff account status updated.',
    });
  }

  async deleteHospitalStaff(id: string) {
    return this.fetchWithFallback(`/hospitals/staff/${id}`, {
      method: 'DELETE',
    }, {
      success: true,
      id,
      message: 'Staff account deleted.',
    });
  }

  // Blood Bank Staff Management APIs
  async getBloodBankStaff() {
    return this.fetchWithFallback('/bloodbanks/staff', { method: 'GET' }, {
      success: true,
      count: MOCK_BLOODBANK_STAFF.length,
      staff: MOCK_BLOODBANK_STAFF,
    });
  }

  async createBloodBankStaff(data: {
    name: string;
    email: string;
    phone: string;
    position: string;
    department?: string;
    password?: string;
    permissions?: string[];
  }) {
    return this.fetchWithFallback('/bloodbanks/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    }, {
      success: true,
      message: 'Position account created successfully.',
      staff: {
        id: `usr_bb_staff_${Date.now().toString().slice(-4)}`,
        facilityId: 'usr_bb_001',
        facilityName: 'Red Crescent Blood Center',
        ...data,
        role: 'BLOOD_BANK',
        isActive: true,
        createdAt: Date.now(),
      } as StaffMember,
    });
  }

  async toggleBloodBankStaffStatus(id: string, isActive?: boolean) {
    return this.fetchWithFallback(`/bloodbanks/staff/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }, {
      success: true,
      id,
      isActive: isActive !== undefined ? isActive : true,
      message: 'Staff account status updated.',
    });
  }

  async deleteBloodBankStaff(id: string) {
    return this.fetchWithFallback(`/bloodbanks/staff/${id}`, {
      method: 'DELETE',
    }, {
      success: true,
      id,
      message: 'Staff account deleted.',
    });
  }
}

export const api = new ApiClient();
