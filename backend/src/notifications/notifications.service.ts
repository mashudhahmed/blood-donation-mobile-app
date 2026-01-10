import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class NotificationsService {
  constructor(private firebaseService: FirebaseService) {}

  // 🔥 Save notifications to Firestore (compatible with Android app)
  private async saveNotifications(
    userIds: string[], 
    title: string, 
    message: string,
    data: Record<string, any> = {}
  ) {
    if (!userIds || userIds.length === 0) {
      console.log('⚠️ No userIds provided, skipping Firestore save');
      return;
    }

    console.log(`🔥 Saving ${userIds.length} notifications to Firestore`);

    try {
      const db = this.firebaseService['getFirestore']
        ? this.firebaseService['getFirestore']()
        : require('firebase-admin').firestore();

      const batch = db.batch();
      const timestamp = db.FieldValue.serverTimestamp();

      userIds.forEach((uid, index) => {
        const ref = db
          .collection('notifications')
          .doc(uid)
          .collection('items')
          .doc(); // Auto-generated ID

        // ✅ PERFECT MATCH with Android NotificationItem structure
        batch.set(ref, {
          title: title,
          message: message,      // Android looks for 'message'
          body: message,         // Android also checks 'body' (for compatibility)
          timestamp: timestamp,  // ✅ Firestore Timestamp (Android expects this)
          read: false,           // Android: isRead field
          type: 'notification',  // ✅ REQUIRED by Android app
          ...data,               // Include any additional data
          _createdAt: new Date().toISOString()
        });

        console.log(`📝 Prepared Firestore save for user ${uid} (${index + 1}/${userIds.length})`);
      });

      await batch.commit();
      console.log(`✅ Successfully saved ${userIds.length} notifications to Firestore`);
    } catch (error) {
      console.error('❌ Error saving to Firestore:', error.message);
      throw error;
    }
  }

  // ✅ SUPPORTS ALL FORMATS with guaranteed Firestore saving
  async sendNotification(
    data: {
      // NEW FORMAT
      tokens?: string[];
      userIds?: string[];           // For direct user IDs
      title: string;
      body: string;
      data?: Record<string, any>;   // Additional data for Android

      // OLD FORMAT (backward compatibility)
      donors?: Array<{ uid: string; fcmToken: string }>;
    }
  ) {
    console.log('🔍 DEBUG: Received notification request:', JSON.stringify(data, null, 2));

    // 🔒 Firebase availability check
    if (!this.firebaseService.isFirebaseReady()) {
      console.warn('⚠️ Firebase not configured');
      return {
        success: false,
        message: 'Firebase not configured',
        sent: 0,
        failed: 0,
        total: 0,
        savedForUsers: 0,
        error: 'Firebase not initialized'
      };
    }

    let tokens: string[] = [];
    let userIds: string[] = [];

    // 🥇 PRIORITY 1: donors format (production-safe with both uid and token)
    if (data.donors && data.donors.length > 0) {
      console.log('📱 Using DONORS format');

      const validDonors = data.donors.filter(
        d => d.uid && d.fcmToken && d.fcmToken.trim()
      );

      tokens = [...new Set(validDonors.map(d => d.fcmToken))];
      userIds = [...new Set(validDonors.map(d => d.uid))];

      console.log(`📊 Parsed: ${validDonors.length} valid donors → ${tokens.length} tokens, ${userIds.length} userIds`);
    }

    // 🥈 PRIORITY 2: tokens + userIds format (new format)
    else if (data.tokens && data.tokens.length > 0) {
      console.log('📱 Using TOKENS + USERIDS format');

      tokens = data.tokens.filter(token => token && token.trim());

      if (data.userIds && data.userIds.length > 0) {
        userIds = data.userIds;
        console.log(`📊 Using provided userIds: ${userIds.length} users`);
      } else {
        console.log('⚠️ No userIds provided with tokens. Notifications will send but NOT save to Firestore!');
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
        savedForUsers: 0
      };
    }

    // Validate tokens
    if (tokens.length === 0) {
      return {
        success: false,
        message: 'No valid tokens found',
        sent: 0,
        failed: 0,
        total: 0,
        savedForUsers: 0
      };
    }

    try {
      const messaging = this.firebaseService.getMessaging();

      // 📱 Build FCM message with Android-specific configuration
      const message = {
        notification: {
          title: data.title,
          body: data.body,
        },
        android: {
          priority: 'high' as const,
          notification: {
            channel_id: 'blood_requests',  // ✅ Match Android channel ID
            icon: 'ic_blood_drop',         // ✅ Your Android notification icon
            color: '#FF0000'               // ✅ Red color for blood donation
          }
        },
        data: data.data || {},  // Include additional data
        tokens: tokens,
      };

      console.log('🚀 Sending to FCM:', {
        title: data.title,
        body: data.body,
        tokenCount: tokens.length,
        userCount: userIds.length,
        androidChannel: 'blood_requests'
      });

      // 📤 Send to FCM
      const response = await messaging.sendEachForMulticast(message);

      console.log('✅ FCM Response:', {
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses?.map(r => ({
          success: r.success,
          messageId: r.messageId,
          error: r.error?.message
        }))
      });

      // 🔥 ALWAYS save to Firestore when userIds exist
      if (userIds.length > 0) {
        try {
          await this.saveNotifications(
            userIds, 
            data.title, 
            data.body,
            data.data || {}
          );
          console.log(`💾 Firestore save completed for ${userIds.length} users`);
        } catch (saveError) {
          console.error('⚠️ Firestore save failed, but FCM was sent:', saveError.message);
          // Don't fail the whole request if Firestore save fails
        }
      } else {
        console.log('⚠️ No userIds available - notification sent but NOT saved to Firestore');
      }

      // ✅ Return comprehensive response
      return {
        success: true,
        sent: response.successCount,
        failed: response.failureCount,
        total: tokens.length,
        savedForUsers: userIds.length,
        message: `Sent ${response.successCount}/${tokens.length} notifications`,
        userIds: userIds,
        firestoreSaved: userIds.length > 0
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
        savedForUsers: 0,
        firestoreSaved: false
      };
    }
  }

  // ✅ NEW: Get user's notifications (for API if needed)
  async getUserNotifications(userId: string) {
    if (!this.firebaseService.isFirebaseReady()) {
      throw new Error('Firebase not configured');
    }

    const db = this.firebaseService['getFirestore']
      ? this.firebaseService['getFirestore']()
      : require('firebase-admin').firestore();

    const snapshot = await db
      .collection('notifications')
      .doc(userId)
      .collection('items')
      .orderBy('timestamp', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
}