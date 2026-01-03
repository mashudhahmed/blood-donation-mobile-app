import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class NotificationsService {
  constructor(private firebaseService: FirebaseService) {}

  // 🔥 Save notifications to Firestore (NO Cloud Functions)
  private async saveNotifications(userIds: string[], message: string) {
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
        message,
        timestamp: new Date(),
        read: false,
      });
    });

    await batch.commit();
  }

  // ✅ UPDATED: Accept both new format (tokens) and old format (donors)
async sendNotification(
  data: {
    // NEW FORMAT (from Android)
    tokens?: string[];
    title: string;
    body: string;
    // OLD FORMAT (backward compatibility)
    donors?: Array<{ uid: string; fcmToken: string; }>;
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

    // 🔥 HANDLE BOTH FORMATS
    let tokens: string[] = [];
    let userIds: string[] = [];

    if (data.tokens && data.tokens.length > 0) {
      // NEW FORMAT: tokens array
      console.log('📱 Using new format (tokens array)');
      tokens = data.tokens;
      // For notifications saving, we'll need user IDs - you might want to store token-to-user mapping
      // For now, we'll skip user IDs for token-only format
      userIds = [];
    } else if (data.donors && data.donors.length > 0) {
      // OLD FORMAT: donors array
      console.log('📱 Using old format (donors array)');
      const validDonors = data.donors.filter(
        d => d.uid && d.fcmToken && d.fcmToken.trim()
      );
      tokens = [...new Set(validDonors.map(d => d.fcmToken))];
      userIds = validDonors.map(d => d.uid);
    } else {
      console.log('❌ No valid data provided');
      return {
        success: false,
        message: 'No valid data provided',
        sent: 0,
        failed: 0,
        total: 0,
      };
    }

    console.log('🔍 DEBUG: Processing tokens:', {
      totalTokens: tokens.length,
      sampleToken: tokens.length > 0 ? tokens[0].substring(0, 20) + '...' : 'none'
    });

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
        tokenCount: tokens.length
      });

      const response = await messaging.sendEachForMulticast(message);

      console.log('✅ FCM Response:', {
        successCount: response.successCount,
        failureCount: response.failureCount
      });

      // Save notifications if we have user IDs
      if (userIds.length > 0) {
        await this.saveNotifications(userIds, data.body);
      }

      return {
        success: true,
        sent: response.successCount,
        failed: response.failureCount,
        total: tokens.length,
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