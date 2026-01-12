// src/notifications/notifications.service.ts
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

  // ✅ UPDATE DONOR TOKEN
  async updateDonorToken(
    donorId: string, 
    data: { 
      fcmToken: string; 
      deviceType?: string; 
      appVersion?: string; 
      updatedAt: Date; 
    }
  ) {
    const update = {
      fcmToken: data.fcmToken,
      deviceType: data.deviceType,
      appVersion: data.appVersion,
      updatedAt: FieldValue.serverTimestamp(),
      isAvailable: true,  // ✅ ENSURE isAvailable is set
      isNotificationEnabled: true,  // ✅ ENSURE notifications are enabled
    };
    
    await this.firebaseService.firestore
      .collection('donors')
      .where('userId', '==', donorId)
      .get()
      .then(snapshot => {
        if (!snapshot.empty) {
          snapshot.docs[0].ref.set(update, { merge: true });
        } else {
          this.firebaseService.firestore
            .collection('donors')
            .doc(donorId)
            .set(update, { merge: true });
        }
      });
  }

  // ==============================
  // BLOOD REQUEST NOTIFICATIONS
  // ==============================
  async notifyCompatibleDonors(body: {
    requestId: string;
    bloodGroup: string;
    district: string;
    hospitalName?: string;
    hospital?: string;
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
        hospitalName: bodyHospitalName,
        hospital: bodyHospital,
        urgency = 'normal',
        patientName,
        contactPhone,
        units = 1,
      } = body;

      // ✅ RESOLVE HOSPITAL NAME
      const hospitalName = bodyHospitalName || bodyHospital || 'Hospital';
      
      // 1️⃣ Find compatible donors
      const compatibleDonors = await this.donorMatchingService.findCompatibleDonors(
        bloodGroup,
        district,
      );

      if (!compatibleDonors || compatibleDonors.length === 0) {
        return {
          success: false,
          message: 'No compatible donors found in this district',
          data: {
            requestId,
            totalCompatibleDonors: 0,
            eligibleDonors: 0,
            notifiedDonors: 0,
            failedNotifications: 0,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // 2️⃣ Filter donors with valid tokens
      const validDonors = compatibleDonors.filter(
        (d: Donor) =>
          d.fcmToken &&
          d.fcmToken.length > 10 &&
          d.isAvailable !== false &&
          d.isNotificationEnabled !== false &&
          d.fcmToken.includes(':')
      );

      if (!validDonors.length) {
        return {
          success: false,
          message: 'Compatible donors found but no valid FCM tokens available',
          data: {
            requestId,
            totalCompatibleDonors: compatibleDonors.length,
            eligibleDonors: 0,
            notifiedDonors: 0,
            failedNotifications: 0,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // 3️⃣ Prepare DATA-ONLY payload
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
          units: units.toString(),
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
      if (failedTokens.length > 0) {
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
      }

      // 6️⃣ Log request
      await this.firebaseService.firestore
        .collection('bloodRequests')
        .doc(requestId)
        .set(
          {
            requestId,
            bloodGroup,
            district,
            hospital: hospitalName,
            hospitalName,
            urgency,
            units,
            totalCompatibleDonors: compatibleDonors.length,
            notifiedDonors: response.successCount,
            failedNotifications: response.failureCount,
            status: response.successCount > 0 ? 'sent' : 'failed',
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

      // ✅ RETURN RESPONSE
      return {
        success: response.successCount > 0,
        message: response.successCount > 0 
          ? `Notifications sent to ${response.successCount} donors` 
          : 'Failed to send notifications',
        data: {
          requestId,
          totalCompatibleDonors: compatibleDonors.length,
          eligibleDonors: validDonors.length,
          notifiedDonors: response.successCount,
          failedNotifications: response.failureCount,
          logId: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('notifyCompatibleDonors error:', error);
      return {
        success: false,
        message: error.message || 'Internal server error',
        data: {
          requestId: body.requestId,
          totalCompatibleDonors: 0,
          eligibleDonors: 0,
          notifiedDonors: 0,
          failedNotifications: 0,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // ==============================
  // SAVE FCM TOKEN
  // ==============================
  async saveFCMToken(data: {
    userId: string;
    fcmToken: string;
    deviceId?: string;
    userType?: string;
  }) {
    const { userId, fcmToken, deviceId, userType } = data;

    const update = {
      fcmToken,
      hasFcmToken: true,
      deviceId,
      userType: userType || 'donor',  // ✅ STORE userType
      isAvailable: true,
      isNotificationEnabled: true,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // ✅ UPDATE DONOR
    await this.firebaseService.firestore
      .collection('donors')
      .where('userId', '==', userId)
      .get()
      .then(snapshot => {
        if (!snapshot.empty) {
          snapshot.docs[0].ref.set(update, { merge: true });
        } else {
          this.firebaseService.firestore
            .collection('donors')
            .doc(userId)
            .set({
              userId,
              ...update,
              createdAt: FieldValue.serverTimestamp(),
            }, { merge: true });
        }
      });
    
    // ✅ UPDATE USER
    await this.firebaseService.firestore
      .collection('users')
      .doc(userId)
      .set(update, { merge: true });

    return { success: true };
  }

  // ==============================
  // SEND TEST NOTIFICATION
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
  // CHECK FIREBASE STATUS
  // ==============================
  async checkFirebaseStatus(): Promise<boolean> {
    return this.firebaseService.isInitialized();
  }
}