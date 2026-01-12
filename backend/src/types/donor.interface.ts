// src/types/donor.interface.ts
export interface Donor {
  // ✅ ESSENTIAL FIELDS (from Android)
  id: string;                      // Firebase document ID
  userId: string;                  // User ID from Firebase Auth
  name: string;
  phone: string;
  bloodGroup: string;
  district: string;
  location?: string;
  
  // ✅ CRITICAL NOTIFICATION FIELDS (must exist)
  fcmToken: string;               // Required for notifications
  lastDonationDate?: number | null; // Only timestamp
  isAvailable: boolean;           // Required for matching
  notificationEnabled: boolean; // Required for notifications
  
  // ✅ BACKWARD COMPATIBILITY FIELDS
  isActive?: boolean;             // Keep for existing queries
  canDonate?: boolean;            // Keep for existing queries
  hasFcmToken?: boolean;          // For token management
  
  // ✅ OPTIONAL FIELDS (if provided by Android)
  email?: string;
  lastDonation?: string;          // "dd/MM/yyyy" format string
  imageUrl?: string;
  createdAt?: number;
  updatedAt?: number;
  
  // ✅ COMPUTED PROPERTIES (set in service)
  daysSinceLastDonation?: number; // Computed in matching service
}

export interface BloodRequest {
  id?: string;
  requestId?: string;
  patientName?: string;
  hospital: string;                 // Single hospital field
  phone: string;
  units: number;
  bloodGroup: string;
  date?: string;
  time?: string;
  district: string;
  location?: string;
  requesterId?: string;
  urgency: string;                  // "normal" or "high" only
  status: string;
}