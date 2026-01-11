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

  /**
   * 🚀 FAST API
   * - Saves blood request immediately
   * - Sends notifications in background
   */
  async createBloodRequest(request: BloodRequest & { requesterId: string }) {
    try {
      const firestore = this.firebaseService.getFirestore();

      // 1️⃣ Save blood request
      const requestRef = firestore.collection('bloodRequests').doc();
      const requestId = requestRef.id;

      await requestRef.set({
        ...request,
        id: requestId,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 2️⃣ Find eligible donors
      const eligibleDonors =
        await this.donorMatchingService.findEligibleDonors({
          bloodGroup: request.bloodGroup,
          district: request.district,
          urgency: request.urgency || 'normal'
        });

      console.log(
        `📊 ${eligibleDonors.length} eligible donors found for ${request.bloodGroup} in ${request.district}`
      );

      // 3️⃣ Send notifications in background (NON-BLOCKING)
      this.sendNotificationsAndSave(
        request,
        eligibleDonors,
        requestId
      ).catch(err => {
        console.error('❌ Background notification error:', err);
      });

      // 4️⃣ Immediate clean response (UI-safe)
      return {
        success: true,
        requestId,
        message: 'Blood request submitted successfully'
      };

    } catch (error) {
      console.error('❌ Error creating blood request:', error);
      return {
        success: false,
        message: 'Failed to submit blood request'
      };
    }
  }

  /**
   * 🔔 BACKGROUND NOTIFICATION JOB
   * - Saves notification history
   * - Sends DATA-ONLY FCM
   */
  private async sendNotificationsAndSave(
    request: BloodRequest,
    donors: any[],
    requestId: string
  ): Promise<number> {

    const messaging = this.firebaseService.getMessaging();
    const firestore = this.firebaseService.getFirestore();

    // Filter valid FCM tokens
    const validDonors = donors.filter(d =>
      d.fcmToken &&
      d.fcmToken.length > 20 &&
      d.fcmToken.includes(':')
    );

    if (validDonors.length === 0) {
      console.log('⚠ No donors with valid FCM tokens');
      return 0;
    }

    // 1️⃣ Save notification history FIRST
    await this.saveNotificationsToDonors(validDonors, request, requestId);

    // 2️⃣ DATA-ONLY FCM PAYLOAD (🔥 FIX)
    const message = {
      data: {
        title: `${request.bloodGroup} Blood Needed Urgently`,
        body: `${request.patientName} needs blood at ${request.hospital}`,
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
      tokens: validDonors.map(d => d.fcmToken),
      android: {
        priority: 'high' as 'high'
      }
    };

    const response = await messaging.sendEachForMulticast(message);

    console.log(
      `📤 Notifications sent: ${response.successCount} success, ${response.failureCount} failed`
    );

    if (response.failureCount > 0) {
      response.responses.forEach((r, i) => {
        if (!r.success) {
          console.error(
            `❌ Token failure (uid=${validDonors[i].uid}): ${r.error?.message}`
          );
        }
      });
    }

    return response.successCount;
  }

  /**
   * 🗂 Save notification history to Firestore
   */
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
        bloodGroup: request.bloodGroup,
        hospital: request.hospital,
        district: request.district,
        contactPhone: request.contactPhone,
        patientName: request.patientName,
        urgency: request.urgency || 'normal',
        units: request.units,
        read: false,
        timestamp,
        createdAt: timestamp
      });
    });

    await batch.commit();
    console.log(`✅ Notification history saved for ${donors.length} donors`);
  }

  // ✅ Other features unchanged
  async getStats() {
    return { status: 'ok' };
  }

  async getMatchingStats(district: string, bloodGroup: string) {
    return this.donorMatchingService.countEligibleDonors(district, bloodGroup);
  }
}
