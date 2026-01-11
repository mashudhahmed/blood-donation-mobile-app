import { Injectable } from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import { DonorMatchingService } from '../matching/donor-matching.service';
import { FirebaseService } from '../firebase/firebase.service';
import { Donor } from '../types/donor.interface';

@Injectable()
export class NotificationsService {
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
        urgency,
        patientName,
        contactPhone,
      } = body;

      // 1. Find compatible donors
      const compatibleDonors = (await this.donorMatchingService.findCompatibleDonors(
        bloodGroup,
        district,
      )) as Donor[];

      if (!compatibleDonors.length) {
        return {
          success: false,
          message: 'No compatible donors found',
          data: { requestId },
        };
      }

      // 2. Filter donors who can receive notifications
      const validDonors = compatibleDonors.filter(
        d =>
          d.fcmToken &&
          d.isActive !== false &&
          d.notificationDisabled !== true &&
          d.canDonate !== false &&
          d.isAvailable !== false,
      );

      if (!validDonors.length) {
        return {
          success: false,
          message: 'No donors with enabled notifications',
          data: { requestId },
        };
      }

      // 3. Prepare message
      const urgencyLevel = urgency || 'normal';

      const title =
        urgencyLevel === 'high' || urgencyLevel === 'critical'
          ? '🚨 URGENT: Blood Needed'
          : '🩸 Blood Donation Request';

      const bodyText = patientName
        ? `${patientName} needs ${bloodGroup} blood at ${hospitalName} (${district})`
        : `${bloodGroup} blood needed at ${hospitalName} in ${district}`;

      // 4. Multicast message (CORRECT Firebase API)
      const tokens = validDonors.map(d => d.fcmToken!);

      const message = {
        tokens,
        notification: {
          title,
          body: bodyText,
        },
        data: {
          type: 'blood_request',
          requestId,
          bloodGroup,
          district,
          hospitalName,
          patientName: patientName || '',
          contactPhone: contactPhone || '',
          urgency: urgencyLevel,
          timestamp: new Date().toISOString(),
          channelId: 'blood_requests',
        },
        android: {
          priority: 'high' as const,
          notification: {
            channelId: 'blood_requests',
            sound: 'default',
            visibility: 'public' as const,
          },
        },
      };

      // 5. Send notification (FIXED)
      const response =
        await this.firebaseService.messaging.sendEachForMulticast(message);

      const failedTokens: string[] = [];

      response.responses.forEach((res, index) => {
        if (!res.success) {
          failedTokens.push(tokens[index]);
          console.warn(
            `❌ Failed token ${tokens[index].substring(0, 15)}...`,
            res.error?.message,
          );
        }
      });

      // 6. Log request
      await this.firebaseService.firestore
        .collection('bloodRequests')
        .doc(requestId)
        .set(
          {
            requestId,
            bloodGroup,
            district,
            hospitalName,
            urgency: urgencyLevel,
            patientName: patientName || null,
            contactPhone: contactPhone || null,
            totalCompatibleDonors: compatibleDonors.length,
            notifiedDonors: response.successCount,
            failedNotifications: response.failureCount,
            failedTokens,
            status: response.successCount > 0 ? 'sent' : 'failed',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

      return {
        success: response.successCount > 0,
        message: `Notifications sent to ${response.successCount} donors`,
        data: {
          requestId,
          totalCompatibleDonors: compatibleDonors.length,
          eligibleDonors: validDonors.length,
          successCount: response.successCount,
          failureCount: response.failureCount,
        },
      };
    } catch (error) {
      console.error('notifyCompatibleDonors error:', error);
      return {
        success: false,
        message: 'Internal server error',
        error: error.message,
      };
    }
  }

  // ==============================
  // TEST NOTIFICATION
  // ==============================
  async sendTestNotification(token: string, message: string) {
    try {
      const res = await this.firebaseService.messaging.send({
        token,
        notification: {
          title: 'Test Notification',
          body: message,
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'blood_requests',
          },
        },
      });

      return { success: true, messageId: res };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==============================
  // SAVE FCM TOKEN
  // ==============================
  async saveFCMToken(data: {
    userId: string;
    fcmToken: string;
    userType?: string;
    deviceId?: string;
  }) {
    const { userId, fcmToken } = data;

    await this.firebaseService.firestore
      .collection('donors')
      .doc(userId)
      .set(
        {
          fcmToken,
          hasFcmToken: true,
          updatedAt: FieldValue.serverTimestamp(),
          deviceInfo: {
            deviceId: data.deviceId || 'unknown',
            lastUpdated: new Date().toISOString(),
          },
        },
        { merge: true },
      );

    await this.firebaseService.firestore
      .collection('users')
      .doc(userId)
      .set(
        {
          fcmToken,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    return { success: true };
  }

  async updateDonorToken(donorId: string, updateData: any) {
    await this.firebaseService.firestore
      .collection('donors')
      .doc(donorId)
      .set(updateData, { merge: true });
  }

  async checkFirebaseStatus(): Promise<boolean> {
    return this.firebaseService.isInitialized();
  }
}
