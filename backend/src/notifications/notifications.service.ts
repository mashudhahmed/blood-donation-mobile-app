import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

interface DonorTarget {
  uid: string;
  fcmToken: string;
}

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

  // ✅ FINAL METHOD (FCM + Firestore)
  async sendNotification(
    donors: DonorTarget[],
    title: string,
    body: string
  ) {
    if (!this.firebaseService.isFirebaseReady()) {
      return {
        success: false,
        message: 'Firebase not configured',
        sent: 0,
        failed: donors?.length || 0,
        total: donors?.length || 0,
      };
    }

    if (!donors || donors.length === 0) {
      return {
        success: false,
        message: 'No donors provided',
        sent: 0,
        failed: 0,
        total: 0,
      };
    }

    // Remove invalid entries
    const validDonors = donors.filter(
      d => d.uid && d.fcmToken && d.fcmToken.trim()
    );

    if (validDonors.length === 0) {
      return {
        success: false,
        message: 'No valid donors',
        sent: 0,
        failed: 0,
        total: 0,
      };
    }

    const tokens = [...new Set(validDonors.map(d => d.fcmToken))];
    const userIds = validDonors.map(d => d.uid);

    try {
      const messaging = this.firebaseService.getMessaging();

      const message = {
        notification: {
          title,
          body,
        },
        android: {
          priority: 'high' as const,
        },
        tokens,
      };

      const response = await messaging.sendEachForMulticast(message);

      // 🔥 THIS WAS MISSING
      await this.saveNotifications(userIds, body);

      return {
        success: true,
        sent: response.successCount,
        failed: response.failureCount,
        total: tokens.length,
      };
    } catch (error: any) {
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
