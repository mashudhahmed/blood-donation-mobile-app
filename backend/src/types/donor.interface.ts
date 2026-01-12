// src/types/donor.interface.ts
import { Timestamp } from 'firebase-admin/firestore';

export interface Donor {
  // ✅ MATCHING ANDROID FIELDS
  id?: string;
  userId: string;                    // ← Changed from donorId to userId
  name: string;
  email?: string;                    // Optional (Android doesn't have it)
  phone: string;
  bloodGroup: string;
  district: string;
  location?: string;                 // Optional (Android has it)
  
  // ✅ MATCHING ANDROID FIELD NAMES
  fcmToken?: string;
  lastDonationDate?: number | Timestamp | Date | null;  // ✅ Added null
  isAvailable?: boolean;             // ← Changed from isActive to isAvailable
  isNotificationEnabled?: boolean;
  
  // ✅ BACKEND-ONLY FIELDS (optional)
  isActive?: boolean;                // Keep for backward compatibility
  canDonate?: boolean;
  lastActive?: string;
  deviceId?: string;
  lastDonation?: string;
  imageUrl?: string;
  createdAt?: number | Timestamp | Date;
  updatedAt?: number | Timestamp | Date;
  
  // ✅ ADD THESE COMPUTED PROPERTIES
  daysSinceLastDonation?: number;    // ← Added for computed property
}

export interface BloodRequest {
  // ✅ MATCH ANDROID FIELDS
  id?: string;
  requestId?: string;
  patientName?: string;
  hospital?: string;                 // Android uses hospital (not hospitalName)
  hospitalName?: string;             // Keep for backward compatibility
  phone: string;
  units: number;
  bloodGroup: string;
  date?: string;                     // String format
  time?: string;                     // String format
  district: string;
  location?: string;
  requesterId?: string;
  requesterEmail?: string;
  urgencyLevel?: string;             // Android uses urgencyLevel
  urgency?: string;                  // Keep for backward compatibility
  status: string;
}