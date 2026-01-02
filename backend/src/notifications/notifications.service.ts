import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class NotificationsService {
  constructor(private firebaseService: FirebaseService) {}

  async sendNotification(tokens: string[], title: string, body: string) {

    if (!this.firebaseService.isFirebaseReady()) {
      return {
        success: false,
        message: 'Firebase not configured',
        sent: 0,
        failed: tokens?.length || 0,
        totalTokens: tokens?.length || 0,
      };
    }

    if (!tokens || tokens.length === 0) {
      return {
        success: false,
        message: 'No tokens provided',
        sent: 0,
        failed: 0,
        totalTokens: 0,
      };
    }

    const uniqueTokens = [...new Set(tokens.filter(t => t?.trim()))];

    if (uniqueTokens.length === 0) {
      return {
        success: false,
        message: 'No valid tokens',
        sent: 0,
        failed: 0,
        totalTokens: 0,
      };
    }

    try {
      const messaging = this.firebaseService.getMessaging();

      const message = {
        notification: {
          title,
          body,
        },
        android: {
          priority: "high" as "high", // 🔥 CRITICAL FIX
        },
        tokens: uniqueTokens,
      };

      const response = await messaging.sendEachForMulticast(message);

      return {
        success: true,
        sent: response.successCount,
        failed: response.failureCount,
        totalTokens: uniqueTokens.length,
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        sent: 0,
        failed: uniqueTokens.length,
        totalTokens: uniqueTokens.length,
      };
    }
  }
}
