// src/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import { DonorMatchingService } from '../matching/donor-matching.service';
import { FirebaseService } from '../firebase/firebase.service';
import { Donor } from '../types/donor.interface';

@Injectable()
export class NotificationsService {
  private _firebaseService: FirebaseService;

  constructor(
    private readonly donorMatchingService: DonorMatchingService,
    firebaseService: FirebaseService,
  ) {
    this._firebaseService = firebaseService;
  }

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
      const { bloodGroup, district, hospitalName, requestId, patientName, contactPhone, urgency } = body;

      // 1. Find compatible donors
      const compatibleDonors = await this.donorMatchingService.findCompatibleDonors(
        bloodGroup,
        district,
      ) as Donor[];

      if (!compatibleDonors || compatibleDonors.length === 0) {
        return {
          success: false,
          message: 'No compatible donors found in your district',
          data: { 
            requestId,
            compatibleDonors: 0,
            notifiedDonors: 0,
            eligibleDonors: 0
          }
        };
      }

      // 2. Filter donors with FCM tokens
      const validDonors = compatibleDonors.filter(donor => 
        donor.fcmToken && 
        donor.isActive &&  
        !donor.notificationDisabled &&
        donor.canDonate !== false &&
        donor.isAvailable !== false
      );

      if (validDonors.length === 0) {
        return {
          success: false,
          message: 'Found donors but none have notification enabled',
          data: { 
            requestId,
            compatibleDonors: compatibleDonors.length,
            withTokens: 0,
            eligibleDonors: validDonors.length
          }
        };
      }

      // 3. Prepare notification message based on urgency
      const urgencyLevel = urgency || 'normal';
      let title = '🩸 Blood Donation Request';
      let bodyText = `${bloodGroup} blood needed at ${hospitalName} in ${district}.`;
      
      if (urgencyLevel === 'high' || urgencyLevel === 'critical') {
        title = '🚨 URGENT: Blood Donation Needed';
        bodyText = `URGENT: ${bloodGroup} blood needed at ${hospitalName}! Please help immediately.`;
      }

      if (patientName) {
        bodyText = `${patientName} needs ${bloodGroup} blood at ${hospitalName} in ${district}.`;
      }

      // 4. Prepare FCM messages - FIXED TypeScript issues
      const messages = validDonors.map(donor => ({
        token: donor.fcmToken!,
        notification: {
          title: title,
          body: bodyText,
        },
        data: {
          requestId,
          bloodGroup,
          district,
          hospital: hospitalName,
          hospitalName: hospitalName,
          patientName: patientName || '',
          contactPhone: contactPhone || '',
          urgency: urgencyLevel,
          type: 'blood_request',
          timestamp: new Date().toISOString(),
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          channelId: 'blood_requests',
          priority: 'high',
          sound: 'default'
        },
        android: {
          priority: 'high' as const,
          notification: {
            channelId: 'blood_requests',
            sound: 'default',
            priority: 'high' as 'high',
            visibility: 'public' as 'public'
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: title,
                body: bodyText
              },
              sound: 'default',
              badge: 1,
              'content-available': 1
            },
          },
        },
      }));

      // 5. Send notifications in batches
      const BATCH_SIZE = 500;
      const results = {
        successCount: 0,
        failureCount: 0,
        responses: [] as any[],
        failedTokens: [] as string[]
      };

      for (let i = 0; i < messages.length; i += BATCH_SIZE) {
        const batch = messages.slice(i, i + BATCH_SIZE);
        
        try {
          const response = await this._firebaseService.messaging.sendEach(batch);
          
          results.successCount += response.successCount;
          results.failureCount += response.failureCount;
          results.responses.push(...response.responses);
          
          response.responses.forEach((resp, index) => {
            if (!resp.success) {
              const tokenPrefix = batch[index].token.substring(0, 20) + '...';
              results.failedTokens.push(tokenPrefix);
              console.warn(`Failed to send to token: ${tokenPrefix} - ${resp.error?.message}`);
            }
          });
        } catch (batchError) {
          console.error('Batch send error:', batchError);
          results.failureCount += batch.length;
        }
      }

      // 6. Log the blood request
      const requestLog = {
        requestId,
        bloodGroup,
        district,
        hospitalName,
        patientName: patientName || null,
        contactPhone: contactPhone || null,
        units: body.units || 1,
        urgency: urgencyLevel,
        requesterId: body.requesterId || null,
        timestamp: FieldValue.serverTimestamp(),
        totalCompatibleDonors: compatibleDonors.length,
        notifiedDonors: validDonors.length,
        successfulNotifications: results.successCount,
        failedNotifications: results.failureCount,
        status: results.successCount > 0 ? 'sent' : 'failed',
        donorIds: validDonors.map(donor => donor.id || donor.donorId),
        failedTokens: results.failedTokens,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };

      await this._firebaseService.firestore
        .collection('bloodRequests')
        .doc(requestId)
        .set(requestLog, { merge: true });

      // 7. Also save to users collection for requester
      if (body.requesterId) {
        await this._firebaseService.firestore
          .collection('users')
          .doc(body.requesterId)
          .collection('bloodRequests')
          .doc(requestId)
          .set({
            ...requestLog,
            status: 'pending'
          }, { merge: true });
      }

      // 8. Return response
      return {
        success: results.successCount > 0,
        message: results.successCount > 0 
          ? `Notifications sent to ${results.successCount} donors` 
          : 'Failed to send notifications',
        data: {
          requestId,
          totalCompatibleDonors: compatibleDonors.length,
          eligibleDonors: validDonors.length,
          notifiedDonors: results.successCount,
          failedNotifications: results.failureCount,
          logId: requestId,
          timestamp: new Date().toISOString()
        },
      };
    } catch (error) {
      console.error('Error in notifyCompatibleDonors:', error);
      return {
        success: false,
        message: 'Internal server error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Test notification method
  async sendTestNotification(token: string, message: string) {
    try {
      const messagePayload = {
        token,
        notification: {
          title: 'Test Notification',
          body: message,
        },
        data: {
          type: 'test',
          timestamp: new Date().toISOString()
        },
        android: {
          priority: 'high' as const,
          notification: {
            channelId: 'blood_requests'
          }
        },
      };
      
      const response = await this._firebaseService.messaging.send(messagePayload);
      return { success: true, messageId: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // NEW: Save FCM token to database
  async saveFCMToken(data: {
    userId: string;
    fcmToken: string;
    userType?: string;
    deviceId?: string;
  }) {
    try {
      const { userId, fcmToken } = data;
      
      // Update in donors collection
      const donorRef = this._firebaseService.firestore
        .collection('donors')
        .doc(userId);

      const updateData = {
        fcmToken,
        hasFcmToken: true,
        updatedAt: FieldValue.serverTimestamp(),
        deviceInfo: {
          type: data.userType || 'donor',
          deviceId: data.deviceId || 'unknown',
          lastTokenUpdate: new Date().toISOString()
        }
      };

      await donorRef.set(updateData, { merge: true });

      // Also update in users collection if exists
      const userRef = this._firebaseService.firestore
        .collection('users')
        .doc(userId);
      
      await userRef.set({
        fcmToken,
        lastTokenUpdate: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      console.log(`✅ FCM token saved for user: ${userId}`);

      return {
        success: true,
        message: 'FCM token saved successfully',
        userId
      };

    } catch (error) {
      console.error('Error in saveFCMToken:', error);
      throw error;
    }
  }

  // Helper method for controller to update donor token
  async updateDonorToken(donorId: string, updateData: any) {
    await this._firebaseService.firestore
      .collection('donors')
      .doc(donorId)
      .set(updateData, { merge: true });
  }

  // Check Firebase status
  async checkFirebaseStatus(): Promise<boolean> {
    return this._firebaseService?.isInitialized?.() || false;
  }

  // Get Firebase service (for testing/debugging)
  getFirebaseService(): FirebaseService {
    return this._firebaseService;
  }
}