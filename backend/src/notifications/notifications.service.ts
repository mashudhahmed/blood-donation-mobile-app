import { Injectable } from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import { DonorMatchingService } from '../matching/donor-matching.service';
import { FirebaseService } from '../firebase/firebase.service';
import { Donor } from '../types/donor.interface';

@Injectable()  // ← THIS DECORATOR IS CRITICAL
export class NotificationsService {  // ← THIS CLASS MUST BE EXPORTED
  constructor(
    private readonly donorMatchingService: DonorMatchingService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async notifyCompatibleDonors(body: {
    requestId: string;
    bloodGroup: string;
    district: string;
    hospitalName: string;
    urgency?: string;
    patientName?: string;
  }) {
    try {
      const { bloodGroup, district, hospitalName, requestId } = body;

      // 1. Find compatible donors
      const compatibleDonors = await this.donorMatchingService.findCompatibleDonors(
        bloodGroup,
        district,
      ) as Donor[];

      if (!compatibleDonors || compatibleDonors.length === 0) {
        return {
          success: false,
          message: 'No compatible donors found in your district',
          data: { compatibleDonors: 0 }
        };
      }

      // 2. Filter donors with FCM tokens
      const validDonors = compatibleDonors.filter(donor => 
        donor.fcmToken && 
        donor.isActive &&  
        !donor.notificationDisabled
      );

      if (validDonors.length === 0) {
        return {
          success: false,
          message: 'Found donors but none have notification enabled',
          data: { 
            compatibleDonors: compatibleDonors.length,
            withTokens: 0 
          }
        };
      }

      // 3. Prepare FCM messages
      const messages = validDonors.map(donor => ({
        token: donor.fcmToken!,
        notification: {
          title: '🚑 URGENT: Blood Donation Request',
          body: `${bloodGroup} blood needed at ${hospitalName} in ${district}. Please help if you can!`,
        },
        data: {
          requestId,
          bloodGroup,
          district,
          hospitalName,
          type: 'BLOOD_REQUEST',
          timestamp: new Date().toISOString(),
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
          priority: 'high' as const,
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
              sound: 'default',
              badge: 1,
            },
          },
        },
      }));

      // 4. Send notifications
      const BATCH_SIZE = 500;
      const results = {
        successCount: 0,
        failureCount: 0,
        responses: [] as any[],
      };

      for (let i = 0; i < messages.length; i += BATCH_SIZE) {
        const batch = messages.slice(i, i + BATCH_SIZE);
        
        try {
          const response = await this.firebaseService.messaging.sendEach(batch);
          
          results.successCount += response.successCount;
          results.failureCount += response.failureCount;
          results.responses.push(...response.responses);
          
          response.responses.forEach((resp, index) => {
            if (!resp.success) {
              console.warn(`Failed to send to token: ${batch[index].token.substring(0, 20)}... - ${resp.error?.message}`);
            }
          });
        } catch (batchError) {
          console.error('Batch send error:', batchError);
          results.failureCount += batch.length;
        }
      }

      // 5. Log the blood request
      const requestLog = {
        requestId,
        bloodGroup,
        district,
        hospitalName,
        timestamp: FieldValue.serverTimestamp(),
        totalCompatibleDonors: compatibleDonors.length,
        notifiedDonors: validDonors.length,
        successfulNotifications: results.successCount,
        failedNotifications: results.failureCount,
        status: results.successCount > 0 ? 'PARTIAL_SUCCESS' : 'FAILED',
        donorIds: validDonors.map(donor => donor.id || donor.donorId),
      };

      await this.firebaseService.firestore
        .collection('bloodRequests')
        .doc(requestId)
        .set(requestLog);

      // 6. Return response
      return {
        success: results.successCount > 0,
        message: results.successCount > 0 
          ? `Notifications sent to ${results.successCount} donors` 
          : 'Failed to send notifications',
        data: {
          requestId,
          totalCompatibleDonors: compatibleDonors.length,
          donorsWithTokens: validDonors.length,
          notificationsSent: results.successCount,
          notificationsFailed: results.failureCount,
          logId: requestId,
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
        android: {
          priority: 'high' as const,
        },
      };
      
      const response = await this.firebaseService.messaging.send(messagePayload);
      return { success: true, messageId: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}