// BloodLink Production API Client
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface Donor {
  id: string;
  name: string;
  phone: string;
  bloodGroup: string;
  district: string;
  canDonate: boolean;
  isAvailable?: boolean;
  totalDonations?: number;
  lastDonationDate?: number;
  location?: string;
  imageUrl?: string;
  email?: string;
  userType?: string;
}

export interface Requisition {
  id: string;
  hospitalId?: string;
  requesterId?: string;
  hospitalName?: string;
  hospital?: string;
  patientName: string;
  bloodGroup: string;
  units: number;
  urgency: 'NORMAL' | 'URGENT' | 'CRITICAL' | 'urgent' | 'critical' | 'normal';
  status: 'pending' | 'matched' | 'dispatched' | 'fulfilled' | 'cancelled' | 'urgent';
  district: string;
  notes?: string;
  medicalReason?: string;
  ward?: string;
  phone?: string;
  matchedDonorsCount?: number;
  date?: string;
  time?: string;
  createdAt: number | string | { _seconds: number; _nanoseconds: number };
}

export interface StockInfo {
  units: number;
  status: 'CRITICAL' | 'LOW' | 'NORMAL' | 'ABUNDANT';
}

export const DEFAULT_INVENTORY: Record<string, StockInfo> = {
  'A+': { units: 18, status: 'NORMAL' },
  'A-': { units: 5, status: 'LOW' },
  'B+': { units: 24, status: 'NORMAL' },
  'B-': { units: 7, status: 'LOW' },
  'AB+': { units: 10, status: 'NORMAL' },
  'AB-': { units: 3, status: 'CRITICAL' },
  'O+': { units: 32, status: 'ABUNDANT' },
  'O-': { units: 4, status: 'CRITICAL' },
};

export interface BloodDrive {
  id: string;
  title: string;
  venue: string;
  district: string;
  date: string;
  targetUnits: number;
  collectedUnits?: number;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED';
  description?: string;
}

export interface InventoryTx {
  id: string;
  bloodGroup: string;
  type: 'INTAKE' | 'DISPATCH' | 'EXPIRED';
  units: number;
  previousUnits: number;
  newUnits: number;
  reason?: string;
  batchOrBagNumber?: string;
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

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  user?: string;
  actor?: string;
  role?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  ipAddress?: string;
  details: string;
  status?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole?: 'DONOR' | 'HOSPITAL' | 'BLOOD_BANK' | 'ADMIN';
  text: string;
  timestamp: string;
  isMe: boolean;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantPhone: string;
  participantBloodGroup: string;
  participantDistrict: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: ChatMessage[];
}

export interface Organization {
  id: string;
  type: 'hospital' | 'bloodbank';
  name: string;
  district: string;
  licenseNumber?: string;
  contactPhone?: string;
  phone?: string;
  verified: boolean;
  isVerified?: boolean;
  verificationStatus?: 'VERIFIED' | 'PENDING' | 'REJECTED';
  verificationNotes?: string;
  createdAt?: string;
}

export interface AdminMetrics {
  totalUsers: number;
  totalDonors: number;
  availableDonors: number;
  totalRequests: number;
  activeRequests: number;
  activeUrgentRequests?: number;
  fulfilledRequests: number;
  totalHospitals: number;
  totalBloodBanks: number;
  donorBloodDistribution?: Record<string, number>;
  bloodGroupDemand?: Record<string, number>;
  timestamp?: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('bloodlink_jwt_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('bloodlink_jwt_token', token);
      } else {
        localStorage.removeItem('bloodlink_jwt_token');
      }
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('bloodlink_jwt_token');
    }
    return this.token;
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const activeToken = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
      ...(options.headers as Record<string, string>),
    };

    const res = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`API Error [${res.status}] ${url}: ${errorText}`);
    }

    return await res.json();
  }

  // Authentication APIs
  async authLogin(data: { email: string; password: string }) {
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch {
      // Fallback directly to backend port 3001
      res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }

    if (!res.ok) {
      if (res.status === 404 && !API_BASE_URL.includes('3001')) {
        const directRes = await fetch('http://localhost:3001/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }).catch(() => null);
        if (directRes && directRes.ok) {
          const json = await directRes.json();
          if (json.token) this.setToken(json.token);
          return json;
        }
      }
      const errorText = await res.text().catch(() => '');
      throw new Error(`Authentication failed (${res.status}): ${errorText}`);
    }

    const json = await res.json();
    if (json.token) {
      this.setToken(json.token);
    }
    return json;
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
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`Registration failed (${res.status}): ${errorText}`);
    }

    const json = await res.json();
    if (json.token) {
      this.setToken(json.token);
    }
    return json;
  }

  // Admin APIs
  async getAdminMetrics() {
    try {
      return await this.request<{
        success: boolean;
        metrics: {
          totalUsers: number;
          totalDonors: number;
          availableDonors: number;
          totalRequests: number;
          activeRequests: number;
          fulfilledRequests: number;
          totalHospitals: number;
          totalBloodBanks: number;
          donorBloodDistribution?: Record<string, number>;
          bloodGroupDemand?: Record<string, number>;
          timestamp?: string;
        };
      }>('/admin/metrics', { method: 'GET' });
    } catch (err) {
      console.error('Error fetching admin metrics:', err);
      return {
        success: false,
        metrics: {
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
        },
      };
    }
  }

  async getAdminDonors(bloodGroup?: string, district?: string) {
    try {
      let url = '/admin/donors?limit=50';
      if (bloodGroup && bloodGroup !== 'all' && bloodGroup !== 'All') {
        url += `&bloodGroup=${encodeURIComponent(bloodGroup)}`;
      }
      if (district && district !== 'all' && district !== 'All') {
        url += `&district=${encodeURIComponent(district)}`;
      }
      return await this.request<{ success: boolean; count: number; donors: Donor[] }>(url, { method: 'GET' });
    } catch (err) {
      console.error('Error fetching donors:', err);
      return { success: false, count: 0, donors: [] };
    }
  }

  async getOrganizations(type?: 'hospital' | 'bloodbank') {
    try {
      const url = type ? `/admin/organizations?type=${type}` : '/admin/organizations';
      return await this.request<{ success: boolean; count: number; organizations: Organization[] }>(url, {
        method: 'GET',
      });
    } catch (err) {
      console.error('Error fetching organizations:', err);
      return { success: false, count: 0, organizations: [] };
    }
  }

  async verifyOrganization(id: string, type: 'hospital' | 'bloodBank', verified: boolean) {
    const status = verified ? 'VERIFIED' : 'PENDING';
    const orgType = type === 'bloodBank' ? 'bloodbank' : 'hospital';
    return await this.request<{ success: boolean; message: string }>(`/admin/organizations/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ type: orgType, status }),
    });
  }

  async updateDonorStatus(id: string, isAvailable: boolean) {
    return await this.request<{ success: boolean; donorId: string; isAvailable: boolean }>(
      `/admin/donors/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable }),
      }
    );
  }

  async getSystemAuditLogs(limit = 30) {
    try {
      return await this.request<{ success: boolean; logs: SystemAuditLog[] }>(`/admin/audit-logs?limit=${limit}`, {
        method: 'GET',
      });
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      return { success: false, logs: [] };
    }
  }

  // Hospital APIs
  async getHospitalRequisitions(status?: string) {
    try {
      const url = status && status !== 'all' ? `/hospitals/requisitions?status=${status}` : '/hospitals/requisitions';
      return await this.request<{ success: boolean; count: number; requisitions: Requisition[] }>(url, {
        method: 'GET',
      });
    } catch (err) {
      console.error('Error fetching requisitions:', err);
      return { success: false, count: 0, requisitions: [] };
    }
  }

  async createRequisition(data: {
    patientName: string;
    bloodGroup: string;
    units: number;
    urgency: string;
    district: string;
    hospitalName?: string;
    contactPhone?: string;
    wardOrDepartment?: string;
    medicalReason?: string;
    notes?: string;
  }) {
    return await this.request<{
      success: boolean;
      requestId: string;
      requisitionId?: string;
      notifiedDonorsCount?: number;
      requisition: Requisition;
      notifications?: Record<string, unknown>;
    }>('/hospitals/requisitions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRequisitionStatus(id: string, status: string, notes?: string) {
    return await this.request<{ success: boolean; requestId: string; status: string }>(
      `/hospitals/requisitions/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, notes }),
      }
    );
  }

  async findCompatibleDonors(bloodGroup: string, district: string, limit = 25) {
    try {
      return await this.request<{
        success: boolean;
        bloodGroup: string;
        district: string;
        count: number;
        donors: Donor[];
      }>(
        `/hospitals/compatible-donors?bloodGroup=${encodeURIComponent(bloodGroup)}&district=${encodeURIComponent(
          district
        )}&limit=${limit}`,
        { method: 'GET' }
      );
    } catch (err) {
      console.error('Error finding compatible donors:', err);
      return { success: false, bloodGroup, district, count: 0, donors: [] };
    }
  }

  // Blood Bank APIs
  async getInventory(bankId = 'usr_bb_001') {
    try {
      const res = await this.request<{
        success: boolean;
        bankId: string;
        totalUnits: number;
        inventory: Record<string, StockInfo>;
        rawStock?: Record<string, number>;
        lastUpdated: string;
      }>(`/bloodbanks/inventory?bankId=${bankId}`, { method: 'GET' });

      if (res && res.inventory && Object.keys(res.inventory).length > 0) {
        const merged: Record<string, StockInfo> = { ...DEFAULT_INVENTORY, ...res.inventory };
        const total = Object.values(merged).reduce((acc, curr) => acc + curr.units, 0);
        return {
          ...res,
          totalUnits: total,
          inventory: merged,
        };
      }
      return {
        success: true,
        bankId,
        totalUnits: Object.values(DEFAULT_INVENTORY).reduce((acc, curr) => acc + curr.units, 0),
        inventory: DEFAULT_INVENTORY,
        lastUpdated: new Date().toISOString(),
      };
    } catch (err) {
      console.warn('Inventory fetch failed, using clinical baseline matrix:', err);
      return {
        success: false,
        bankId,
        totalUnits: Object.values(DEFAULT_INVENTORY).reduce((acc, curr) => acc + curr.units, 0),
        inventory: DEFAULT_INVENTORY,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  async adjustInventory(data: {
    bloodGroup: string;
    type: 'INTAKE' | 'DISPATCH' | 'EXPIRED';
    units: number;
    reason?: string;
    batchOrBagNumber?: string;
  }) {
    return await this.request<{
      success: boolean;
      bloodGroup: string;
      type: string;
      updatedUnits: number;
      transaction?: InventoryTx;
    }>('/bloodbanks/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getBloodBankTransactions(limit = 25) {
    try {
      return await this.request<{
        success: boolean;
        count: number;
        transactions: InventoryTx[];
      }>(`/bloodbanks/transactions?limit=${limit}`, { method: 'GET' });
    } catch (err) {
      console.error('Error fetching transactions:', err);
      return { success: false, count: 0, transactions: [] };
    }
  }

  async getBloodDrives() {
    try {
      return await this.request<{
        success: boolean;
        count: number;
        drives: BloodDrive[];
      }>('/bloodbanks/drives', { method: 'GET' });
    } catch (err) {
      console.error('Error fetching drives:', err);
      return { success: false, count: 0, drives: [] };
    }
  }

  async createBloodDrive(data: {
    title: string;
    venue: string;
    district: string;
    date: string;
    targetUnits: number;
    description?: string;
  }) {
    return await this.request<{
      success: boolean;
      driveId: string;
      drive: BloodDrive;
    }>('/bloodbanks/drives', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async recordWalkInDonation(data: { donorId: string; bloodGroup: string; units?: number }) {
    return await this.request<{
      success: boolean;
      message: string;
    }>('/bloodbanks/donations/record', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Staff Management APIs
  async getHospitalStaff() {
    try {
      return await this.request<{ success: boolean; count: number; staff: StaffMember[] }>('/hospitals/staff', {
        method: 'GET',
      });
    } catch (err) {
      console.error('Error fetching hospital staff:', err);
      return { success: false, count: 0, staff: [] };
    }
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
    return await this.request<{ success: boolean; message: string; staff: StaffMember }>('/hospitals/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async toggleHospitalStaffStatus(id: string, isActive?: boolean) {
    return await this.request<{ success: boolean; id: string; isActive: boolean }>(`/hospitals/staff/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }

  async deleteHospitalStaff(id: string) {
    return await this.request<{ success: boolean; id: string; message: string }>(`/hospitals/staff/${id}`, {
      method: 'DELETE',
    });
  }

  async getBloodBankStaff() {
    try {
      return await this.request<{ success: boolean; count: number; staff: StaffMember[] }>('/bloodbanks/staff', {
        method: 'GET',
      });
    } catch (err) {
      console.error('Error fetching blood bank staff:', err);
      return { success: false, count: 0, staff: [] };
    }
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
    return await this.request<{ success: boolean; message: string; staff: StaffMember }>('/bloodbanks/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async toggleBloodBankStaffStatus(id: string, isActive?: boolean) {
    return await this.request<{ success: boolean; id: string; isActive: boolean }>(`/bloodbanks/staff/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }

  async deleteBloodBankStaff(id: string) {
    return await this.request<{ success: boolean; id: string; message: string }>(`/bloodbanks/staff/${id}`, {
      method: 'DELETE',
    });
  }

  // Live Donor Messages & Chat API (Synced with Mobile Firestore chats)
  async getConversations() {
    try {
      return await this.request<{ success: boolean; count: number; conversations: Conversation[] }>(
        '/messages/conversations',
        { method: 'GET' }
      );
    } catch (err) {
      console.error('Error fetching conversations:', err);
      return { success: false, count: 0, conversations: [] };
    }
  }

  async getMessages(conversationId: string) {
    try {
      return await this.request<{ success: boolean; count: number; messages: ChatMessage[] }>(
        `/messages/conversations/${conversationId}/messages`,
        { method: 'GET' }
      );
    } catch (err) {
      console.error(`Error fetching messages for conversation ${conversationId}:`, err);
      return { success: false, count: 0, messages: [] };
    }
  }

  async sendMessage(conversationId: string, text: string) {
    return await this.request<{ success: boolean; messageId: string; text: string; timestamp: string }>(
      `/messages/conversations/${conversationId}/send`,
      {
        method: 'POST',
        body: JSON.stringify({ text }),
      }
    );
  }
}

export const api = new ApiClient();
