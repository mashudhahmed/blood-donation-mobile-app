import { Injectable } from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import { DonorMatchingService } from '../matching/donor-matching.service';
import { FirebaseService } from '../firebase/firebase.service';

interface NotificationData {
  id: string;
  requestId: string;
  title: string;
  message: string;
  type: string;
  bloodGroup: string;
  hospital: string;
  district: string;
  urgency: string;
  patientName: string;
  contactPhone: string;
  units: number;
  isRead: boolean;
  createdAt: any;
  expiresAt: Date;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly donorMatchingService: DonorMatchingService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async notifyCompatibleDonors(body: {
    requestId: string;
    bloodGroup: string;
    district: string;
    hospitalName?: string;
    hospital?: string;
    medicalName?: string;
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
        medicalName: bodyMedicalName,
        urgency = 'normal',
        patientName,
        contactPhone,
        units = 1,
        requesterId,
      } = body;

      const hospitalName = bodyHospitalName || bodyHospital || bodyMedicalName || 'Hospital';
      
      console.log('🔍 Starting eligibility check for donors...');

      // ✅ CRITICAL: Get eligible donors with ALL filters applied
      const eligibleDonors = await this.donorMatchingService.findCompatibleDonors(
        bloodGroup,
        district,
        50,
        requesterId
      );

      console.log(`✅ Found ${eligibleDonors.length} ELIGIBLE donors after all filters`);

      if (!eligibleDonors || eligibleDonors.length === 0) {
        return {
          success: false,
          message: 'No eligible donors found in this district',
          data: {
            requestId,
            totalCompatibleDonors: 0,
            eligibleDonors: 0,
            storedNotifications: 0,
            sentNotifications: 0,
            timestamp: new Date().toISOString(),
          },
        };
      }

      const title = urgency === 'high' ? '🚨 URGENT: Blood Needed' : '🩸 Blood Donation Request';
      const bodyText = patientName
        ? `${patientName} needs ${bloodGroup} blood at ${hospitalName} (${district})`
        : `${bloodGroup} blood needed at ${hospitalName} in ${district}`;

      let storedCount = 0;
      let sentCount = 0;
      const failedTokens: string[] = [];

      // ✅ Process each eligible donor
      for (const donor of eligibleDonors) {
        try {
          // 1. Create unique notification ID
          const notificationId = `notif_${requestId}_${donor.userId}_${Date.now()}`;
          
          // 2. Store notification in Firestore (ALWAYS store, even if offline)
          await this.storeNotificationForUser(donor.userId, {
            id: notificationId,
            requestId,
            title,
            message: bodyText,
            type: 'blood_request',
            bloodGroup,
            hospital: hospitalName,
            district,
            urgency,
            patientName: patientName || '',
            contactPhone: contactPhone || '',
            units,
            isRead: false,
            createdAt: FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days expiry
          });
          
          storedCount++;
          console.log(`💾 Stored notification for ${donor.name} (${donor.userId})`);

          // 3. If donor has valid FCM token, send real-time push
          if (donor.fcmToken && donor.fcmToken.length > 20 && donor.fcmToken.includes(':')) {
            try {
              const message = {
                token: donor.fcmToken,
                data: {
                  type: 'blood_request',
                  title,
                  body: bodyText,
                  requestId,
                  notificationId,
                  bloodGroup,
                  district,
                  hospital: hospitalName,
                  medicalName: hospitalName,
                  urgency,
                  units: units.toString(),
                  channelId: 'blood_requests',
                  timestamp: new Date().toISOString(),
                  // ✅ Critical: Identify recipient
                  recipientUserId: donor.userId,
                  recipientName: donor.name,
                  action: 'VIEW_NOTIFICATION',
                },
                android: {
                  priority: 'high' as const,
                },
              };

              await this.firebaseService.messaging.send(message);
              sentCount++;
              console.log(`📤 Sent push to ${donor.name}`);
              
            } catch (pushError) {
              console.error(`❌ Failed to send push to ${donor.userId}:`, pushError.message);
              failedTokens.push(donor.fcmToken);
            }
          } else {
            console.log(`⏸️  No valid token for ${donor.name}, notification stored only`);
          }

        } catch (error) {
          console.error(`❌ Error processing donor ${donor.userId}:`, error);
        }
      }

      // 4. Clean up invalid tokens
      if (failedTokens.length > 0) {
        await this.cleanupInvalidTokens(failedTokens);
      }

      // 5. Log the complete request
      await this.firebaseService.firestore
        .collection('bloodRequests')
        .doc(requestId)
        .set(
          {
            requestId,
            bloodGroup,
            district,
            hospital: hospitalName,
            urgency,
            units,
            requesterId: requesterId || null,
            totalEligibleDonors: eligibleDonors.length,
            storedNotifications: storedCount,
            sentNotifications: sentCount,
            failedNotifications: failedTokens.length,
            notificationStatus: 'processed',
            processedAt: FieldValue.serverTimestamp(),
            donorDetails: eligibleDonors.map(d => ({
              userId: d.userId,
              name: d.name,
              hasToken: !!d.fcmToken,
              bloodGroup: d.bloodGroup,
              lastDonation: d.lastDonationDate,
              isAvailable: d.isAvailable,
              daysSinceDonation: d.daysSinceLastDonation,
            })),
          },
          { merge: true },
        );

      return {
        success: true,
        message: `Processed ${storedCount} notifications (${sentCount} real-time, ${storedCount - sentCount} stored)`,
        data: {
          requestId,
          totalEligibleDonors: eligibleDonors.length,
          storedNotifications: storedCount,
          sentNotifications: sentCount,
          failedNotifications: failedTokens.length,
          notificationIds: eligibleDonors.map(d => `notif_${requestId}_${d.userId}`),
          timestamp: new Date().toISOString(),
          note: 'Notifications stored in database. Users will see them when they log in.',
        },
      };

    } catch (error) {
      console.error('❌ notifyCompatibleDonors error:', error);
      return {
        success: false,
        message: error.message || 'Internal server error',
        data: {
          requestId: body.requestId,
          totalEligibleDonors: 0,
          storedNotifications: 0,
          sentNotifications: 0,
          failedNotifications: 0,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // ✅ Store notification in user's notification collection
  private async storeNotificationForUser(userId: string, notificationData: NotificationData) {
    try {
      await this.firebaseService.firestore
        .collection('notifications')
        .doc(userId)
        .collection('items')
        .doc(notificationData.id)
        .set(notificationData, { merge: true });
      
      // Update unread count
      await this.updateUnreadCount(userId);
      
      return true;
    } catch (error) {
      console.error('Error storing notification:', error);
      return false;
    }
  }

  // ✅ Update user's unread notification count
  private async updateUnreadCount(userId: string) {
    try {
      const snapshot = await this.firebaseService.firestore
        .collection('notifications')
        .doc(userId)
        .collection('items')
        .where('isRead', '==', false)
        .get();
      
      const unreadCount = snapshot.size;
      
      await this.firebaseService.firestore
        .collection('users')
        .doc(userId)
        .set({
          unreadNotificationCount: unreadCount,
          lastNotificationCheck: FieldValue.serverTimestamp(),
        }, { merge: true });
      
      return unreadCount;
    } catch (error) {
      console.error('Error updating unread count:', error);
      return 0;
    }
  }

  // ✅ Get user's notifications (for NotificationFragment)
  async getUserNotifications(userId: string, limit: number = 50) {
    try {
      const snapshot = await this.firebaseService.firestore
        .collection('notifications')
        .doc(userId)
        .collection('items')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      
      const notifications = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          isRead: data.isRead || false, // Ensure isRead exists
        };
      });
      
      return {
        success: true,
        count: notifications.length,
        unreadCount: notifications.filter(n => !n.isRead).length,
        notifications,
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return {
        success: false,
        count: 0,
        unreadCount: 0,
        notifications: [],
        error: error.message,
      };
    }
  }

  // ✅ Mark notification as read
  async markAsRead(userId: string, notificationId: string) {
    try {
      await this.firebaseService.firestore
        .collection('notifications')
        .doc(userId)
        .collection('items')
        .doc(notificationId)
        .update({
          isRead: true,
          readAt: FieldValue.serverTimestamp(),
        });
      
      // Update unread count
      await this.updateUnreadCount(userId);
      
      return { success: true };
    } catch (error) {
      console.error('Error marking as read:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ Mark all as read
  async markAllAsRead(userId: string) {
    try {
      const snapshot = await this.firebaseService.firestore
        .collection('notifications')
        .doc(userId)
        .collection('items')
        .where('isRead', '==', false)
        .get();
      
      const batch = this.firebaseService.firestore.batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          isRead: true,
          readAt: FieldValue.serverTimestamp(),
        });
      });
      
      await batch.commit();
      
      // Update unread count
      await this.updateUnreadCount(userId);
      
      return { 
        success: true, 
        markedCount: snapshot.size 
      };
    } catch (error) {
      console.error('Error marking all as read:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ Cleanup invalid FCM tokens
  private async cleanupInvalidTokens(tokens: string[]) {
    for (const token of tokens) {
      try {
        await this.firebaseService.firestore
          .collection('donors')
          .where('fcmToken', '==', token)
          .get()
          .then(snapshot => {
            snapshot.docs.forEach(doc => {
              doc.ref.update({
                fcmToken: FieldValue.delete(),
                hasFcmToken: false,
                lastTokenError: FieldValue.serverTimestamp(),
              });
            });
          });
      } catch (error) {
        console.error('Error cleaning up token:', error);
      }
    }
  }

  // ✅ Get unread notification count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const userDoc = await this.firebaseService.firestore
        .collection('users')
        .doc(userId)
        .get();
      
      return userDoc.data()?.unreadNotificationCount || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // ✅ Clear expired notifications (cron job)
  async clearExpiredNotifications() {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // This is expensive - consider using Cloud Functions for Firestore triggers
      console.log('Clearing expired notifications...');
      
      return { success: true, clearedCount: 0 };
    } catch (error) {
      console.error('Error clearing expired notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ Add missing methods that the controller expects

  async saveFCMToken(body: {
    userId: string;
    fcmToken: string;
    deviceId?: string;
    userType?: string;
    deviceType?: string;
    appVersion?: string;
  }) {
    try {
      const { userId, fcmToken, deviceId, userType, deviceType, appVersion } = body;
      
      // Create a compound ID for device tracking
      const compoundTokenId = `${userId}_${deviceId || 'unknown'}`;
      
      await this.firebaseService.firestore
        .collection('donors')
        .doc(userId)
        .set({
          userId,
          fcmToken,
          deviceId,
          userType: userType || 'donor',
          deviceType: deviceType || 'mobile',
          appVersion: appVersion || '1.0.0',
          compoundTokenId,
          hasFcmToken: true,
          updatedAt: new Date(),
          lastActive: new Date(),
        }, { merge: true });

      console.log(`✅ Saved FCM token for user ${userId}, device: ${deviceId || 'unknown'}`);
      
      return { success: true, compoundTokenId };
    } catch (error) {
      console.error('Error saving FCM token:', error);
      throw new Error(`Failed to save FCM token: ${error.message}`);
    }
  }

  async updateDonorToken(donorId: string, tokenData: {
    fcmToken: string;
    deviceId?: string;
    deviceType?: string;
    appVersion?: string;
    updatedAt: Date;
  }) {
    try {
      await this.firebaseService.firestore
        .collection('donors')
        .doc(donorId)
        .set({
          fcmToken: tokenData.fcmToken,
          deviceId: tokenData.deviceId,
          deviceType: tokenData.deviceType,
          appVersion: tokenData.appVersion,
          hasFcmToken: true,
          updatedAt: tokenData.updatedAt,
          lastActive: tokenData.updatedAt,
        }, { merge: true });

      console.log(`✅ Updated token for donor ${donorId}`);
      
      return { success: true };
    } catch (error) {
      console.error('Error updating donor token:', error);
      throw new Error(`Failed to update donor token: ${error.message}`);
    }
  }

  async checkFirebaseStatus() {
    try {
      // Check if Firebase is initialized by trying a simple operation
      await this.firebaseService.firestore.collection('health').doc('check').get();
      return true;
    } catch (error) {
      console.error('Firebase health check failed:', error);
      return false;
    }
  }

  async sendTestNotification(token: string) {
    try {
      const message = {
        token,
        data: {
          type: 'test',
          title: '✅ Test Notification',
          body: 'Your notification system is working!',
          urgency: 'normal',
          channelId: 'blood_requests',
          timestamp: new Date().toISOString()
        },
        android: { priority: 'high' as const },
        apns: {
          payload: {
            aps: {
              alert: {
                title: '✅ Test Notification',
                body: 'Your notification system is working!'
              },
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await this.firebaseService.messaging.send(message);
      console.log('Test notification sent successfully:', response);
      
      return { success: true, messageId: response };
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw new Error(`Failed to send test notification: ${error.message}`);
    }
  }
}