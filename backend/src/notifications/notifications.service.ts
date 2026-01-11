import { Injectable } from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import { DonorMatchingService } from '../matching/donor-matching.service';
import { FirebaseService } from '../firebase/firebase.service';
import { Donor } from '../types/donor.interface';

@Injectable()
export class NotificationsService {
  updateDonorToken(donorId: string, arg1: { fcmToken: string; deviceType: string | undefined; appVersion: string | undefined; updatedAt: Date; }) {
    throw new Error('Method not implemented.');
  }
  constructor(
    private readonly donorMatchingService: DonorMatchingService,
    private readonly firebaseService: FirebaseService,
  ) {}

  // ==============================
  // BLOOD REQUEST NOTIFICATIONS
  // ==============================
  async notifyCompatibleDonors(body: {
    requestId: string;
    bloodGroup: string;
    district: string;
    hospitalName: string;
    urgency?: string;
    patientName?: string;
    contactPhone?: string;
    units?: number;
    requesterId?: string;
  }) {
    try {
      const {
        requestId,
        bloodGroup,
        district,
        hospitalName,
        urgency = 'normal',
        patientName,
        contactPhone,
      } = body;

      // 1️⃣ Find compatible donors
      const compatibleDonors = (await this.donorMatchingService.findCompatibleDonors(
        bloodGroup,
        district,
      )) as Donor[];

      if (!compatibleDonors.length) {
        return { success: false, message: 'No compatible donors found' };
      }

      // 2️⃣ Filter donors with valid tokens
      const validDonors = compatibleDonors.filter(
        d =>
          d.fcmToken &&
          d.isActive !== false &&
          d.notificationDisabled !== true &&
          d.canDonate !== false &&
          d.isAvailable !== false,
      );

      if (!validDonors.length) {
        return { success: false, message: 'No donors with enabled notifications' };
      }

      // 3️⃣ Prepare DATA-ONLY payload (Android-safe)
      const title =
        urgency === 'high' || urgency === 'critical'
          ? '🚨 URGENT: Blood Needed'
          : '🩸 Blood Donation Request';

      const bodyText = patientName
        ? `${patientName} needs ${bloodGroup} blood at ${hospitalName} (${district})`
        : `${bloodGroup} blood needed at ${hospitalName} in ${district}`;

      const tokens = validDonors.map(d => d.fcmToken!);

      const message = {
        tokens,
        data: {
          type: 'blood_request',
          title,
          body: bodyText,
          requestId,
          bloodGroup,
          district,
          hospital: hospitalName,
          hospitalName,
          patientName: patientName || '',
          contactPhone: contactPhone || '',
          urgency,
          channelId: 'blood_requests',
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: 'high' as const,
        },
      };

      // 4️⃣ Send multicast
      const response =
        await this.firebaseService.messaging.sendEachForMulticast(message);

      const failedTokens: string[] = [];

      response.responses.forEach((res, index) => {
        if (!res.success) {
          failedTokens.push(tokens[index]);
        }
      });

      // 5️⃣ Clean up invalid tokens
      await Promise.all(
        failedTokens.map(token =>
          this.firebaseService.firestore
            .collection('donors')
            .where('fcmToken', '==', token)
            .get()
            .then(snapshot =>
              snapshot.docs.map(doc =>
                doc.ref.set(
                  {
                    fcmToken: FieldValue.delete(),
                    hasFcmToken: false,
                    updatedAt: FieldValue.serverTimestamp(),
                  },
                  { merge: true },
                ),
              ),
            ),
        ),
      );

      // 6️⃣ Log request
      await this.firebaseService.firestore
        .collection('bloodRequests')
        .doc(requestId)
        .set(
          {
            requestId,
            bloodGroup,
            district,
            hospitalName,
            urgency,
            totalCompatibleDonors: compatibleDonors.length,
            notifiedDonors: response.successCount,
            failedNotifications: response.failureCount,
            status: response.successCount > 0 ? 'sent' : 'failed',
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

      return {
        success: response.successCount > 0,
        message: `Notifications sent to ${response.successCount} donors`,
      };
    } catch (error) {
      console.error('notifyCompatibleDonors error:', error);
      return { success: false, message: error.message };
    }
  }

  // ==============================
  // TEST NOTIFICATION (REAL)
  // ==============================
  async sendTestNotification(token: string) {
    return this.firebaseService.messaging.send({
      token,
      data: {
        type: 'test',
        title: '✅ Test Notification',
        body: 'Your notification system is working!',
        urgency: 'normal',
        channelId: 'blood_requests',
      },
      android: { priority: 'high' },
    });
  }

  // ==============================
  // SAVE FCM TOKEN
  // ==============================
  async saveFCMToken(data: {
    userId: string;
    fcmToken: string;
    deviceId?: string;
  }) {
    const { userId, fcmToken } = data;

    const update = {
      fcmToken,
      hasFcmToken: true,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await Promise.all([
      this.firebaseService.firestore.collection('donors').doc(userId).set(update, { merge: true }),
      this.firebaseService.firestore.collection('users').doc(userId).set(update, { merge: true }),
    ]);

    return { success: true };
  }

  async checkFirebaseStatus(): Promise<boolean> {
    return this.firebaseService.isInitialized();
  }
}
