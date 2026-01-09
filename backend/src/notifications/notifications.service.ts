import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class NotificationsService {
  constructor(private firebaseService: FirebaseService) {}

  // 🔥 Save notifications to Firestore (NO Cloud Functions)
  private async saveNotifications(userIds: string[], title: string, message: string) {
    if (!userIds || userIds.length === 0) return;

    const db = this.firebaseService['getFirestore']
      ? this.firebaseService['getFirestore']()
      : require('firebase-admin').firestore();

    const batch = db.batch();

    userIds.forEach(uid => {
      const ref = db
        .collection('notifications')
        .doc(uid)
        .collection('items')
        .doc();

      batch.set(ref, {
        title,
        message,
        timestamp: new Date(),
        read: false,
      });
    });

    await batch.commit();
  }

  // ✅ Supports both formats and guarantees Firestore saving when user IDs exist
  async sendNotification(
    data: {
      // NEW FORMAT
      tokens?: string[];
      userIds?: string[]; // ✅ OPTIONAL: allow direct userIds
      title: string;
      body: string;

      // OLD FORMAT (backward compatibility)
      donors?: Array<{ uid: string; fcmToken: string }>;
    }
  ) {
    console.log('🔍 DEBUG: Received notification request:', data);

    if (!this.firebaseService.isFirebaseReady()) {
      console.warn('⚠️ Firebase not configured');
      return {
        success: false,
        message: 'Firebase not configured',
        sent: 0,
        failed: 0,
        total: 0,
      };
    }

    let tokens: string[] = [];
    let userIds: string[] = [];

    // 🥇 Priority 1: donors format (best & production-safe)
    if (data.donors && data.donors.length > 0) {
      console.log('📱 Using donors format');

      const validDonors = data.donors.filter(
        d => d.uid && d.fcmToken && d.fcmToken.trim()
      );

      tokens = [...new Set(validDonors.map(d => d.fcmToken))];
      userIds = [...new Set(validDonors.map(d => d.uid))];
    }

    // 🥈 Priority 2: tokens + userIds (new supported format)
    else if (data.tokens && data.tokens.length > 0) {
      console.log('📱 Using tokens format');

      tokens = data.tokens;

      if (data.userIds && data.userIds.length > 0) {
        userIds = data.userIds;
      }
    }

    else {
      console.log('❌ No valid data provided');
      return {
        success: false,
        message: 'No valid data provided',
        sent: 0,
        failed: 0,
        total: 0,
      };
    }

    if (tokens.length === 0) {
      return {
        success: false,
        message: 'No valid tokens found',
        sent: 0,
        failed: 0,
        total: 0,
      };
    }

    try {
      const messaging = this.firebaseService.getMessaging();

      const message = {
        notification: {
          title: data.title,
          body: data.body,
        },
        android: {
          priority: 'high' as const,
        },
        tokens,
      };

      console.log('🚀 Sending to FCM:', {
        title: data.title,
        body: data.body,
        tokenCount: tokens.length,
        userCount: userIds.length
      });

      const response = await messaging.sendEachForMulticast(message);

      console.log('✅ FCM Response:', {
        successCount: response.successCount,
        failureCount: response.failureCount
      });

      // 🔥 ALWAYS save when user IDs exist
      if (userIds.length > 0) {
        await this.saveNotifications(userIds, data.title, data.body);
      }

      return {
        success: true,
        sent: response.successCount,
        failed: response.failureCount,
        total: tokens.length,
        savedForUsers: userIds.length
      };
    } catch (error: any) {
      console.error('❌ Error sending notification:', error.message);
      console.error('❌ Error stack:', error.stack);
      return {
        success: false,
        error: error.message,
        sent: 0,
        failed: tokens.length,
        total: tokens.length,
      };
    }
  }
}
