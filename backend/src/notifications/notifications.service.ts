import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class NotificationsService {
  constructor(private firebaseService: FirebaseService) {}

  async sendNotification(tokens: string[], title: string, body: string) {
    // First check if Firebase is ready
    if (!this.firebaseService.isFirebaseReady()) {
      console.warn('⚠️ Firebase not initialized - returning mock response');
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

    // Remove duplicates and invalid tokens
    const validTokens = tokens.filter(token => token && token.trim().length > 0);
    const uniqueTokens = [...new Set(validTokens)];

    if (uniqueTokens.length === 0) {
      return {
        success: false,
        message: 'No valid tokens provided',
        sent: 0,
        failed: 0,
        totalTokens: 0,
      };
    }

    try {
      const messaging = this.firebaseService.getMessaging();
      
      const message = {
        notification: { title, body },
        tokens: uniqueTokens,
      };

      const response = await messaging.sendEachForMulticast(message);
      
      return {
        success: true,
        sent: response.successCount,
        failed: response.failureCount,
        totalTokens: uniqueTokens.length,
      };
    } catch (error) {
      console.error('❌ Error sending notification:', error.message);
      return {
        success: false,
        error: error.message,
        code: error.code,
        sent: 0,
        failed: uniqueTokens.length,
        totalTokens: uniqueTokens.length,
      };
    }
  }
}