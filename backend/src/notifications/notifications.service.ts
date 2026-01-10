import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { DonorMatchingService } from '../matching/donor-matching.service';
import * as admin from 'firebase-admin';

interface BloodRequest {
  patientName: string;
  hospital: string;
  bloodGroup: string;
  units: number;
  district: string;
  contactPhone: string;
  urgency?: 'normal' | 'urgent' | 'critical';
  notes?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private firebaseService: FirebaseService,
    private donorMatchingService: DonorMatchingService // ✅ Added injection
  ) {}

  // 1. Create blood request and notify ELIGIBLE donors
  async createBloodRequest(request: BloodRequest & { requesterId: string }) {
    try {
      const firestore = this.firebaseService.getFirestore();
      
      // Save request to Firestore
      const requestRef = firestore.collection('bloodRequests').doc();
      const requestId = requestRef.id;
      
      const requestData = {
        ...request,
        id: requestId,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      await requestRef.set(requestData);

      // ✅ Use DonorMatchingService to find ELIGIBLE donors (90+ days, compatible blood, available)
      const eligibleDonors = await this.donorMatchingService.findEligibleDonors({
        bloodGroup: request.bloodGroup,
        district: request.district,
        urgency: request.urgency || 'normal'
      });

      console.log(`📊 Found ${eligibleDonors.length} eligible donors for ${request.bloodGroup} in ${request.district}`);

      // Send notifications AND save to Firestore for each donor
      const notifiedCount = await this.sendNotificationsAndSave(request, eligibleDonors, requestId);
      
      return {
        success: true,
        requestId,
        notifiedCount,
        eligibleDonors: eligibleDonors.length,
        message: `Blood request created. Notified ${notifiedCount} eligible donors.`
      };
      
    } catch (error) {
      console.error('❌ Error creating blood request:', error);
      return {
        success: false,
        message: error.message,
        error: error.stack
      };
    }
  }

  // ✅ NEW: Send notifications AND save to Firestore for notification history
  private async sendNotificationsAndSave(
    request: BloodRequest, 
    donors: any[], 
    requestId: string
  ): Promise<number> {
    const messaging = this.firebaseService.getMessaging();
    const firestore = this.firebaseService.getFirestore();
    
    // Filter donors with valid FCM tokens
    const validDonors = donors.filter(donor => 
      donor.fcmToken && 
      donor.fcmToken.length > 20 && 
      donor.fcmToken.includes(':')
    );

    if (validDonors.length === 0) {
      console.log('⚠ No donors with valid FCM tokens found');
      return 0;
    }

    const tokens = validDonors.map(donor => donor.fcmToken);
    
    // Create notification message
    const message = {
      notification: {
        title: `${request.bloodGroup} Blood Needed Urgently`,
        body: `${request.patientName} needs blood at ${request.hospital}`
      },
      data: {
        type: 'blood_request',
        requestId,
        patientName: request.patientName,
        bloodGroup: request.bloodGroup,
        hospital: request.hospital,
        district: request.district,
        contactPhone: request.contactPhone,
        urgency: request.urgency || 'normal',
        units: request.units.toString()
      },
      tokens: tokens,
      android: {
        priority: "high" as "high",
        notification: {
          sound: 'default',
          channelId: 'blood_requests'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };
    
    try {
      // Save notification to each donor's Firestore collection FIRST
      await this.saveNotificationsToDonors(validDonors, request, requestId);
      
      // Then send push notifications
      const response = await messaging.sendEachForMulticast(message);
      
      console.log(`📤 Notifications sent: ${response.successCount} successful, ${response.failureCount} failed`);
      
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(`❌ Failed to send to token ${tokens[idx].substring(0, 20)}...: ${resp.error?.message}`);
          }
        });
      }
      
      return response.successCount;
    } catch (error) {
      console.error('❌ Notification error:', error.message);
      return 0;
    }
  }

  // ✅ NEW: Save notification to each donor's Firestore collection
  private async saveNotificationsToDonors(
    donors: any[], 
    request: BloodRequest, 
    requestId: string
  ): Promise<void> {
    const firestore = this.firebaseService.getFirestore();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    const batch = firestore.batch();
    
    donors.forEach(donor => {
      const notificationRef = firestore
        .collection('notifications')
        .doc(donor.uid)
        .collection('items')
        .doc(requestId);
      
      const notificationData = {
        id: requestId,
        title: `🩸 ${request.bloodGroup} Blood Request`,
        message: `${request.patientName} needs ${request.units} unit(s) of blood at ${request.hospital}`,
        type: 'blood_request',
        bloodGroup: request.bloodGroup,
        hospital: request.hospital,
        district: request.district,
        contactPhone: request.contactPhone,
        patientName: request.patientName,
        units: request.units,
        urgency: request.urgency || 'normal',
        requestId: requestId,
        read: false,
        timestamp: timestamp,
        createdAt: timestamp
      };
      
      batch.set(notificationRef, notificationData);
    });
    
    try {
      await batch.commit();
      console.log(`✅ Saved notifications to ${donors.length} donors' Firestore`);
    } catch (error) {
      console.error('❌ Error saving notifications to Firestore:', error.message);
    }
  }

  // ✅ UPDATED: Get notification stats (now includes matching stats)
  async getStats() {
    const firestore = this.firebaseService.getFirestore();
    
    const [requestsSnapshot, donorsSnapshot] = await Promise.all([
      firestore.collection('bloodRequests')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get(),
      firestore.collection('donors')
        .where('isAvailable', '==', true)
        .get()
    ]);
    
    const requests: any[] = [];
    requestsSnapshot.forEach(doc => requests.push({ id: doc.id, ...doc.data() }));
    
    const availableDonors = donorsSnapshot.size;
    
    // Calculate recent requests by urgency
    const urgentRequests = requests.filter(r => r.urgency === 'urgent' || r.urgency === 'critical').length;
    const normalRequests = requests.filter(r => r.urgency === 'normal').length;
    
    return {
      totalRequests: requests.length,
      recentRequests: requests.slice(0, 10),
      urgentRequests,
      normalRequests,
      availableDonors,
      timestamp: new Date().toISOString()
    };
  }

  // ✅ NEW: Get donor matching statistics
  async getMatchingStats(district: string, bloodGroup: string) {
    try {
      const eligibleCount = await this.donorMatchingService.countEligibleDonors(district, bloodGroup);
      const compatibleDonors = this.donorMatchingService['bloodCompatibility'].getCompatibleDonors(bloodGroup);
      
      return {
        bloodGroup,
        district,
        eligibleDonors: eligibleCount,
        compatibleBloodTypes: compatibleDonors,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        error: error.message,
        bloodGroup,
        district
      };
    }
  }
}