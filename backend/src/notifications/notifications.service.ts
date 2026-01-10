import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import * as admin from 'firebase-admin';

@Injectable() // ✅ MUST have @Injectable() decorator
export class NotificationsService { // ✅ MUST be 'export class' (not default)
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
      // ✅ FIXED: Use the proper getFirestore() method
      const db = this.firebaseService.getFirestore();
      
      const batch = db.batch();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();

      userIds.forEach((uid, index) => {
        const ref = db
          .collection('notifications')
          .doc(uid)
          .collection('items')
          .doc();

        batch.set(ref, {
          title: title,
          message: message,
          body: message,
          timestamp: timestamp,
          read: false,
          type: 'notification',
          ...data,
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
      tokens?: string[];
      userIds?: string[];
      title: string;
      body: string;
      data?: Record<string, any>;
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

    // 🥇 PRIORITY 1: donors format
    if (data.donors && data.donors.length > 0) {
      console.log('📱 Using DONORS format');
      const validDonors = data.donors.filter(d => d.uid && d.fcmToken && d.fcmToken.trim());
      tokens = [...new Set(validDonors.map(d => d.fcmToken))];
      userIds = [...new Set(validDonors.map(d => d.uid))];
      console.log(`📊 Parsed: ${validDonors.length} valid donors → ${tokens.length} tokens, ${userIds.length} userIds`);
    }
    // 🥈 PRIORITY 2: tokens + userIds format
    else if (data.tokens && data.tokens.length > 0) {
      console.log('📱 Using TOKENS + USERIDS format');
      tokens = data.tokens.filter(token => token && token.trim());
      if (data.userIds && data.userIds.length > 0) {
        userIds = data.userIds;
        console.log(`📊 Using provided userIds: ${userIds.length} users`);
      } else {
        console.log('⚠️ No userIds provided with tokens. Notifications will send but NOT save to Firestore!');
      }
    } else {
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

      const fcmMessage = {
        notification: { title: data.title, body: data.body },
        android: {
          priority: 'high' as const,
          notification: {
            channel_id: 'blood_requests',
            icon: 'ic_blood_drop',
            color: '#FF0000'
          }
        },
        data: data.data || {},
        tokens: tokens,
      };

      console.log('🚀 Sending to FCM:', {
        title: data.title,
        body: data.body,
        tokenCount: tokens.length,
        userCount: userIds.length
      });

      const response = await messaging.sendEachForMulticast(fcmMessage);

      console.log('✅ FCM Response:', {
        successCount: response.successCount,
        failureCount: response.failureCount
      });

      // 🔥 Save to Firestore when userIds exist
      if (userIds.length > 0) {
        try {
          await this.saveNotifications(userIds, data.title, data.body, data.data || {});
          console.log(`💾 Firestore save completed for ${userIds.length} users`);
        } catch (saveError) {
          console.error('⚠️ Firestore save failed, but FCM was sent:', saveError.message);
        }
      } else {
        console.log('⚠️ No userIds available - notification sent but NOT saved to Firestore');
      }

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

  // ✅ Get user's notifications
  async getUserNotifications(userId: string) {
    if (!this.firebaseService.isFirebaseReady()) {
      throw new Error('Firebase not configured');
    }

    const db = this.firebaseService.getFirestore();
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
// ✅ MUST END WITH THE CLASS CLOSING BRACE - NO EXTRA EXPORTS NEEDED