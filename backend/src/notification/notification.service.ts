// notification.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { messaging } from 'firebase-admin';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  sound?: string;
  badge?: number;
}

@Injectable()
export class NotificationService implements OnModuleInit {
  sendPush(tokens: string[], arg1: string, arg2: string) {
    throw new Error('Method not implemented.');
  }
  private readonly logger = new Logger(NotificationService.name);
  private messaging: messaging.Messaging;

  async onModuleInit() {
    await this.initializeFirebase();
  }

  private async initializeFirebase() {
    try {
      // Check if Firebase is already initialized
      if (admin.apps.length === 0) {
        // Option 1: Using environment variables (recommended)
        if (process.env.FIREBASE_PROJECT_ID) {
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: process.env.FIREBASE_PROJECT_ID,
          });
        }
        // Option 2: Using service account JSON
        else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
        }
        // Option 3: Direct JSON in environment
        else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
        } else {
          throw new Error('Firebase configuration not found');
        }
        
        this.logger.log('✅ Firebase Admin SDK initialized successfully');
      }

      this.messaging = admin.messaging();
      
      // Test Firebase connection
      await this.testFirebaseConnection();
      
    } catch (error) {
      this.logger.error('❌ Failed to initialize Firebase Admin SDK', error);
      throw error;
    }
  }

  private async testFirebaseConnection() {
    try {
      // Simple test to verify Firebase is working
      await this.messaging.send({
        topic: 'test',
        data: { test: 'true' }
      }, true); // dryRun = true, won't actually send
      this.logger.log('✅ Firebase connection test successful');
    } catch (error) {
      this.logger.warn('⚠️ Firebase connection test failed (this is normal if no valid config)');
    }
  }

  /**
   * Send notification to a single device
   * @param token - FCM device token
   * @param payload - Notification payload
   */
  async sendToDevice(
    token: string,
    payload: NotificationPayload,
  ): Promise<string> {
    try {
      const message: messaging.Message = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        android: {
          priority: 'high',
          notification: {
            sound: payload.sound || 'default',
            channelId: 'high_importance_channel',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              sound: payload.sound || 'default',
              badge: payload.badge || 1,
              'mutable-content': 1,
            },
          },
        },
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: payload.imageUrl,
            badge: payload.imageUrl,
          },
        },
      };

      const response = await this.messaging.send(message);
      this.logger.log(`📱 Notification sent to single device: ${response}`);
      return response;
    } catch (error) {
      this.logger.error('❌ Error sending notification to device', {
        token: token.substring(0, 10) + '...',
        error: error.message,
        code: error.code,
      });
      throw error;
    }
  }

  /**
   * Send notification to multiple devices (CORRECT METHOD)
   * @param tokens - Array of FCM device tokens (max 500 per call)
   * @param payload - Notification payload
   */
  async sendToMultipleDevices(
    tokens: string[],
    payload: NotificationPayload,
  ): Promise<messaging.BatchResponse> {
    try {
      // Validate input
      if (!tokens || tokens.length === 0) {
        throw new Error('No device tokens provided');
      }

      // Remove duplicates and invalid tokens
      const uniqueTokens = [...new Set(tokens)].filter(token => 
        token && token.length > 0
      );

      if (uniqueTokens.length === 0) {
        throw new Error('No valid device tokens provided');
      }

      // Firebase limits: max 500 tokens per multicast
      const MAX_TOKENS_PER_BATCH = 500;
      let allResponses: messaging.BatchResponse = {
        responses: [],
        successCount: 0,
        failureCount: 0,
      };

      // Process in batches
      for (let i = 0; i < uniqueTokens.length; i += MAX_TOKENS_PER_BATCH) {
        const batchTokens = uniqueTokens.slice(i, i + MAX_TOKENS_PER_BATCH);
        
        const message: messaging.MulticastMessage = {
          tokens: batchTokens,
          notification: {
            title: payload.title,
            body: payload.body,
            imageUrl: payload.imageUrl,
          },
          data: payload.data,
          android: {
            priority: 'high',
          },
          apns: {
            payload: {
              aps: {
                alert: {
                  title: payload.title,
                  body: payload.body,
                },
                sound: payload.sound || 'default',
                badge: payload.badge || 1,
              },
            },
          },
        };

        // ✅ CORRECT METHOD: sendEachForMulticast (not sendMulticast)
        const batchResponse = await this.messaging.sendEachForMulticast(message);
        
        // Combine responses
        allResponses.responses.push(...batchResponse.responses);
        allResponses.successCount += batchResponse.successCount;
        allResponses.failureCount += batchResponse.failureCount;

        this.logger.log(
          `📱 Batch ${Math.floor(i / MAX_TOKENS_PER_BATCH) + 1}: ` +
          `${batchResponse.successCount} successful, ` +
          `${batchResponse.failureCount} failed`
        );

        // Log detailed failures
        if (batchResponse.failureCount > 0) {
          batchResponse.responses.forEach((response, index) => {
            if (!response.success && response.error) {
              this.logger.warn(
                `⚠️ Failed token ${batchTokens[index].substring(0, 10)}...: ` +
                `${response.error.code} - ${response.error.message}`
              );
            }
          });
        }
      }

      this.logger.log(
        `📱 Total: ${allResponses.successCount} successful, ` +
        `${allResponses.failureCount} failed out of ${uniqueTokens.length} tokens`
      );

      return allResponses;
    } catch (error) {
      this.logger.error('❌ Error sending multicast notification', {
        error: error.message,
        code: error.code,
        tokenCount: tokens?.length,
      });
      throw error;
    }
  }

  /**
   * Send multiple different messages efficiently
   * @param messages - Array of individual messages
   */
  async sendMultipleIndividualMessages(
    messages: messaging.Message[]
  ): Promise<messaging.BatchResponse> {
    try {
      // ✅ CORRECT METHOD: sendEach for multiple different messages
      const response = await this.messaging.sendEach(messages);
      
      this.logger.log(
        `📱 sendEach: ${response.successCount} successful, ` +
        `${response.failureCount} failed out of ${response.responses.length} messages`
      );
      
      return response;
    } catch (error) {
      this.logger.error('❌ Error in sendEach', error);
      throw error;
    }
  }

  /**
   * Send to a topic
   * @param topic - Firebase topic
   * @param payload - Notification payload
   */
  async sendToTopic(
    topic: string,
    payload: NotificationPayload,
  ): Promise<string> {
    try {
      // Remove /topics/ prefix if present, we'll add it properly
      const cleanTopic = topic.replace(/^\/topics\//, '');
      
      const message: messaging.Message = {
        topic: cleanTopic,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
      };

      const response = await this.messaging.send(message);
      this.logger.log(`📱 Notification sent to topic "${cleanTopic}": ${response}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Error sending to topic "${topic}"`, error);
      throw error;
    }
  }

  /**
   * Validate if Firebase is configured and working
   */
  async isFirebaseConfigured(): Promise<boolean> {
    try {
      return this.messaging !== undefined && admin.apps.length > 0;
    } catch {
      return false;
    }
  }
}