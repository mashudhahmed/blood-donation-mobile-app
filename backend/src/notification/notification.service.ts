// firebase.service.ts - UPDATED VERSION
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private messaging: admin.messaging.Messaging;

  async onModuleInit() {
    await this.initializeFirebase();
  }

  private async initializeFirebase() {
    try {
      if (admin.apps.length === 0) {
        // OPTION 1: Use full JSON from environment variable (EASIEST)
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
          
          // Fix newlines in private key (important!)
          if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
          }
          
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          
          this.logger.log('✅ Firebase initialized with JSON credentials');
        }
        // OPTION 2: Use individual environment variables
        else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
          const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          };
          
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          
          this.logger.log('✅ Firebase initialized with individual credentials');
        } else {
          this.logger.warn('⚠️ Firebase credentials not found. App will run without Firebase.');
          return;
        }
      }

      this.messaging = admin.messaging();
      this.logger.log('✅ Firebase messaging service ready');
      
      // Test the connection
      await this.testFirebaseConnection();
      
    } catch (error) {
      this.logger.error('❌ Failed to initialize Firebase:', error.message);
      this.logger.warn('⚠️ App will continue without Firebase notifications');
    }
  }

  private async testFirebaseConnection() {
    try {
      // Try a dry-run message to test Firebase
      await this.messaging.send({
        topic: 'test-topic',
        data: { test: 'true' }
      }, true); // dryRun = true, doesn't actually send
      
      this.logger.log('✅ Firebase connection test successful');
    } catch (error) {
      this.logger.warn(`⚠️ Firebase connection test failed: ${error.message}`);
    }
  }

  /**
   * Send notification to multiple devices
   */
  async sendToMultipleDevices(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<admin.messaging.BatchResponse> {
    if (!this.messaging) {
      throw new Error('Firebase is not initialized');
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: { title, body },
        data,
        android: { priority: 'high' },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
              sound: 'default',
            },
          },
        },
      };

      // ✅ Use the correct method name
      const response = await this.messaging.sendEachForMulticast(message);
      
      this.logger.log(
        `📱 Notifications sent: ${response.successCount} successful, ${response.failureCount} failed`,
      );
      
      return response;
    } catch (error) {
      this.logger.error('❌ Error sending notifications:', error);
      throw error;
    }
  }

  /**
   * Send notification to single device
   */
  async sendToDevice(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<string> {
    if (!this.messaging) {
      throw new Error('Firebase is not initialized');
    }

    const message: admin.messaging.Message = {
      token,
      notification: { title, body },
      data,
    };
    
    return this.messaging.send(message);
  }

  /**
   * Check if Firebase is ready
   */
  isFirebaseReady(): boolean {
    return !!this.messaging;
  }
}