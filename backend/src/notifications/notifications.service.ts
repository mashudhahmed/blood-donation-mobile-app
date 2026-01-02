import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class NotificationsService {
  constructor(private firebaseService: FirebaseService) {}

  async sendNotification(tokens: string[], title: string, body: string) {
    if (!tokens || tokens.length === 0) {
      return { success: false, message: 'No tokens provided' };
    }

    // Remove duplicates and invalid tokens
    const uniqueTokens = [...new Set(tokens.filter(token => token && token.length > 0))];

    if (uniqueTokens.length === 0) {
      return { success: false, message: 'No valid tokens provided' };
    }

    const message = {
      notification: { title, body },
      tokens: uniqueTokens,
    };

    try {
      const response = await this.firebaseService
        .getMessaging()
        .sendEachForMulticast(message);
      
      return {
        success: true,
        sent: response.successCount,
        failed: response.failureCount,
        totalTokens: uniqueTokens.length,
      };
    } catch (error) {
      console.error('Error sending notification:', error);
      return { 
        success: false, 
        error: error.message,
        code: error.code 
      };
    }
  }
}