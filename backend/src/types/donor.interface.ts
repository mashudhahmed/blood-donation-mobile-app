// src/types/donor.interface.ts
import { Timestamp } from 'firebase-admin/firestore';

export interface Donor {
  id?: string;
  donorId: string;
  name: string;
  email: string;
  phone: string;
  bloodGroup: string;
  district: string;
  fcmToken?: string;  // Fixed typo: was "furnToken"
  lastDonationDate?: Timestamp | Date;
  isActive: boolean;
  notificationDisabled?: boolean;
  canDonate?: boolean;
  isAvailable?: boolean;
  daysSinceLastDonation?: number;  // Added for computed property
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface BloodRequest {
  requestId: string;
  bloodGroup: string;
  district: string;
  hospitalName: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  patientName?: string;
  timestamp: Timestamp | Date;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  notifiedDonors: string[]; // array of donor IDs
}