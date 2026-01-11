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
    private donorMatchingService: DonorMatchingService
  ) {}

  // ✅ FAST API – notifications run in background
  async createBloodRequest(request: BloodRequest & { requesterId: string }) {
    try {
      const firestore = this.firebaseService.getFirestore();

      // 1️⃣ Save request FIRST
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

      // 2️⃣ Find eligible donors
      const eligibleDonors = await this.donorMatchingService.findEligibleDonors({
        bloodGroup: request.bloodGroup,
        district: request.district,
        urgency: request.urgency || 'normal'
      });

      console.log(
        `📊 Found ${eligibleDonors.length} eligible donors for ${request.bloodGroup} in ${request.district}`
      );

      // 3️⃣ 🔥 SEND NOTIFICATIONS ASYNC (NO await)
      this.sendNotificationsAndSave(
        request,
        eligibleDonors,
        requestId
      ).catch(err => {
        console.error('❌ Background notification error:', err);
      });

      // 4️⃣ IMMEDIATE RESPONSE 🚀
      return {
        success: true,
        requestId,
        eligibleDonors: eligibleDonors.length,
        message: 'Blood request created successfully. Notifications are being sent.'
      };

    } catch (error) {
      console.error('❌ Error creating blood request:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // 🔔 BACKGROUND JOB (unchanged logic)
  private async sendNotificationsAndSave(
    request: BloodRequest,
    donors: any[],
    requestId: string
  ): Promise<number> {

    const messaging = this.firebaseService.getMessaging();

    const validDonors = donors.filter(d =>
      d.fcmToken &&
      d.fcmToken.length > 20 &&
      d.fcmToken.includes(':')
    );

    if (validDonors.length === 0) {
      console.log('⚠ No donors with valid FCM tokens');
      return 0;
    }

    // 1️⃣ Save notification history
    await this.saveNotificationsToDonors(validDonors, request, requestId);

    // 2️⃣ Send FCM
    const message = {
      notification: {
        title: `${request.bloodGroup} Blood Needed Urgently`,
        body: `${request.patientName} needs blood at ${request.hospital}`
      },
      data: {
        type: 'blood_request',
        requestId,
        bloodGroup: request.bloodGroup,
        hospital: request.hospital,
        district: request.district,
        contactPhone: request.contactPhone,
        urgency: request.urgency || 'normal',
        units: request.units.toString()
      },
      tokens: validDonors.map(d => d.fcmToken),
      android: {
        priority: 'high' as 'high',
        notification: {
          sound: 'default',
          channelId: 'blood_requests'
        }
      }
    };

    const response = await messaging.sendEachForMulticast(message);

    console.log(
      `📤 Notifications sent: ${response.successCount} success, ${response.failureCount} failed`
    );

    return response.successCount;
  }

  // ✅ UNCHANGED – Firestore history
  private async saveNotificationsToDonors(
    donors: any[],
    request: BloodRequest,
    requestId: string
  ): Promise<void> {

    const firestore = this.firebaseService.getFirestore();
    const batch = firestore.batch();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    donors.forEach(donor => {
      const ref = firestore
        .collection('notifications')
        .doc(donor.uid)
        .collection('items')
        .doc(requestId);

      batch.set(ref, {
        id: requestId,
        title: `🩸 ${request.bloodGroup} Blood Request`,
        message: `${request.patientName} needs ${request.units} unit(s) at ${request.hospital}`,
        type: 'blood_request',
        read: false,
        timestamp,
        createdAt: timestamp
      });
    });

    await batch.commit();
  }

  // ✅ STATS & MATCHING – unchanged
  async getStats() { /* SAME AS YOUR CODE */ }

  async getMatchingStats(district: string, bloodGroup: string) {
    return this.donorMatchingService.countEligibleDonors(district, bloodGroup);
  }
}
