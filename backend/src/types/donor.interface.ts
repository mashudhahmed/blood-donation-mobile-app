// src/types/donor.interface.ts

// ✅ User Device Interface (for per-device token storage)
export interface UserDevice {
  userId: string;                    // User ID from Firebase Auth
  fcmToken: string;                  // FCM token for this device
  deviceId: string;                  // Unique device identifier
  compoundTokenId: string;           // userId_deviceId combination
  userType: string;                  // "donor" | "recipient" | "admin"
  deviceType?: string;               // "android" | "ios"
  appVersion?: string;               // App version
  isAvailable: boolean;              // Availability status
  notificationEnabled: boolean;      // Notification permission status
  hasFcmToken: boolean;              // Token validity flag
  lastActive: number;                // Last activity timestamp
  createdAt: number;                 // Creation timestamp
  updatedAt: number;                 // Last update timestamp
  isLoggedIn?: boolean;              // ✅ ADDED: Login status
}

// ✅ Donor Interface (Main donor document)
export interface Donor {
  // ✅ ESSENTIAL IDENTIFICATION FIELDS
  id: string;                        // Firebase document ID
  userId: string;                    // User ID from Firebase Auth (matches auth.uid)
  
  // ✅ PERSONAL INFORMATION
  name: string;
  phone: string;
  email?: string;
  imageUrl?: string;
  
  // ✅ DONOR SPECIFIC FIELDS
  bloodGroup: string;
  district: string;
  location?: string;
  
  // ✅ DEVICE & TOKEN MANAGEMENT FIELDS (Account-Specific)
  fcmToken: string;                  // Current active device token
  deviceId?: string;                 // Current device ID
  compoundTokenId?: string;          // userId_deviceId for uniqueness
  deviceType?: string;               // Device type (android/ios)
  appVersion?: string;               // App version
  
  // ✅ ELIGIBILITY & AVAILABILITY FIELDS
  lastDonationDate?: number | null;  // Timestamp of last donation
  isAvailable: boolean;              // Current availability status
  notificationEnabled: boolean;      // Notification permission status
  isLoggedIn?: boolean;              // ✅ ADDED: Current login status
  
  // ✅ BACKWARD COMPATIBILITY FIELDS
  isActive?: boolean;                // For existing queries
  canDonate?: boolean;               // For existing queries
  hasFcmToken?: boolean;             // Token management flag
  
  // ✅ TIMESTAMP FIELDS
  createdAt?: number;
  updatedAt?: number;
  lastActive?: number;               // Last app activity
  
  // ✅ COMPUTED PROPERTIES (set in service)
  daysSinceLastDonation?: number;    // Computed in matching service
  
  // ✅ OPTIONAL FIELDS
  lastDonation?: string;             // "dd/MM/yyyy" format string (legacy)
  
  // ✅ ADDITIONAL FIELDS (optional)
  age?: number;
  weight?: number;
  height?: string;
  gender?: string;
  emergencyContact?: string;
  medicalConditions?: string[];
  donationCount?: number;
}

// ✅ Blood Request Interface
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
  requesterId?: string;             // User ID of who made the request
  urgency: string;                  // "normal" or "high" only
  status: string;                   // "pending", "fulfilled", "cancelled"
  createdAt?: number;
  updatedAt?: number;
  
  // ✅ Notification tracking
  notifiedDonors?: string[];        // Array of donor IDs who were notified
  totalCompatibleDonors?: number;   // Total compatible donors found
  actualNotifiedCount?: number;     // Actual number notified
  failedNotifications?: number;     // Failed notification count
  
  // ✅ Additional tracking
  requesterDeviceId?: string;       // Device ID of requester
  requesterCompoundTokenId?: string; // Compound token ID of requester
}

// ✅ Notification Log Interface
export interface NotificationLog {
  id: string;
  requestId: string;
  type: 'blood_request' | 'test' | 'system';
  title: string;
  body: string;
  recipientUserId: string;          // Who should receive this
  recipientDeviceId?: string;       // Which device it was sent to
  recipientToken?: string;          // FCM token used
  data: Record<string, any>;        // All data sent
  status: 'sent' | 'delivered' | 'failed' | 'read';
  sentAt: number;
  deliveredAt?: number;
  readAt?: number;
  error?: string;
}

// ✅ Donor Eligibility Criteria Interface
export interface DonorEligibilityCriteria {
  bloodGroup: string;               // Required blood group
  district: string;                 // Required district
  minDaysSinceLastDonation: number; // Default: 90 days
  maxAge?: number;                  // Optional: maximum age
  minWeight?: number;               // Optional: minimum weight in kg
  excludeUserIds?: string[];        // Users to exclude (e.g., requester)
  excludeDeviceIds?: string[];      // Devices to exclude
}

// ✅ Donor Match Result Interface
export interface DonorMatchResult {
  donor: Donor;
  matchScore: number;               // Higher = better match
  distance?: number;                // Distance in km (if location available)
  eligibility: {
    bloodGroupMatch: boolean;
    districtMatch: boolean;
    timeEligible: boolean;          // 90+ days since last donation
    availability: boolean;
    notificationEnabled: boolean;
    hasValidToken: boolean;
    sameDeviceAsRequester: boolean;
  };
}

// ✅ API Response Interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface BloodRequestResponse extends ApiResponse {
  data?: {
    requestId: string;
    totalCompatibleDonors: number;
    eligibleDonors: number;
    notifiedDonors: number;
    failedNotifications: number;
    recipients: Array<{
      userId: string;
      name?: string;
      deviceId?: string;
    }>;
    requesterExcluded: boolean;
    sameDeviceExcluded: boolean;
    timestamp: string;
  };
}

export interface TokenSaveResponse extends ApiResponse {
  data?: {
    userId: string;
    deviceId: string;
    compoundTokenId: string;
    timestamp: string;
  };
}