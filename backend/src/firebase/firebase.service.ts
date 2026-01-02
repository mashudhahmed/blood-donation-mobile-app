// firebase.service.ts
import { Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';

export interface DecodedToken {
  uid: string;
  email?: string;
  phone_number?: string;
  name?: string;
  picture?: string;
  [key: string]: any;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private messaging: admin.messaging.Messaging;
  private auth: admin.auth.Auth;
  private isInitialized = false;

  async onModuleInit() {
    await this.initializeFirebase();
  }

  private async initializeFirebase() {
    try {
      if (admin.apps.length === 0) {
        // OPTION 1: Single JSON string (RECOMMENDED for Render)
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
          
          // Fix newlines in private key
          if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
          }
          
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          
          this.logger.log('✅ Firebase initialized with JSON credentials');
          this.isInitialized = true;
        }
        // OPTION 2: Individual environment variables
        else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
          const serviceAccount = {
            type: 'service_account',
            project_id: process.env.FIREBASE_PROJECT_ID!,
            private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
            private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            client_email: process.env.FIREBASE_CLIENT_EMAIL || '',
            client_id: process.env.FIREBASE_CLIENT_ID || '',
            auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
            token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
            client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || '',
            universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || 'googleapis.com',
          } as admin.ServiceAccount;
          
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          
          this.logger.log('✅ Firebase initialized with individual credentials');
          this.isInitialized = true;
        }
        // OPTION 3: Default credentials (for local dev)
        else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
          });
          
          this.logger.log('✅ Firebase initialized with default credentials');
          this.isInitialized = true;
        } 
        else {
          this.logger.warn('⚠️ Firebase credentials not found. App will run without Firebase.');
          return;
        }
      } else {
        this.isInitialized = true;
      }

      if (this.isInitialized) {
        this.messaging = admin.messaging();
        this.auth = admin.auth();
        this.logger.log('✅ Firebase services (messaging & auth) ready');
        
        // Test connection silently
        await this.testFirebaseConnection();
      }
      
    } catch (error) {
      this.logger.error('❌ Failed to initialize Firebase:', error.message);
      this.logger.warn('⚠️ App will continue without Firebase notifications');
      this.isInitialized = false;
    }
  }

  private async testFirebaseConnection() {
    try {
      // Silent test - only log if fails
      await this.messaging.send({
        topic: 'test-connection',
        data: { test: 'true' }
      }, true); // dryRun = true
    } catch (error) {
      this.logger.warn(`⚠️ Firebase test failed: ${error.message}`);
    }
  }

  // ==================== AUTHENTICATION METHODS ====================

  /**
   * Verify Firebase ID token
   * @param token - Firebase ID token
   * @returns Decoded token payload
   */
  async verifyToken(token: string): Promise<DecodedToken> {
    if (!this.isInitialized || !this.auth) {
      throw new UnauthorizedException('Firebase auth service not available');
    }

    try {
      // Remove 'Bearer ' prefix if present
      const cleanToken = token.replace('Bearer ', '');
      
      const decodedToken = await this.auth.verifyIdToken(cleanToken, true);
      
      return {
        email: decodedToken.email,
        phone_number: decodedToken.phone_number,
        name: decodedToken.name,
        picture: decodedToken.picture,
        ...decodedToken,
      };
    } catch (error) {
      this.logger.error(`❌ Token verification failed: ${error.message}`);
      
      if (error.code === 'auth/id-token-expired') {
        throw new UnauthorizedException('Token has expired');
      } else if (error.code === 'auth/id-token-revoked') {
        throw new UnauthorizedException('Token has been revoked');
      } else if (error.code === 'auth/invalid-id-token') {
        throw new UnauthorizedException('Invalid token');
      } else {
        throw new UnauthorizedException('Authentication failed');
      }
    }
  }

  /**
   * Get user by Firebase UID
   */
  async getUser(uid: string): Promise<admin.auth.UserRecord> {
    if (!this.isInitialized || !this.auth) {
      throw new Error('Firebase auth service not available');
    }

    try {
      return await this.auth.getUser(uid);
    } catch (error) {
      this.logger.error(`❌ Failed to get user ${uid}:`, error.message);
      throw error;
    }
  }

  /**
   * Create custom token for a user (for client-side sign-in)
   */
  async createCustomToken(uid: string, additionalClaims?: any): Promise<string> {
    if (!this.isInitialized || !this.auth) {
      throw new Error('Firebase auth service not available');
    }

    try {
      return await this.auth.createCustomToken(uid, additionalClaims);
    } catch (error) {
      this.logger.error(`❌ Failed to create custom token:`, error.message);
      throw error;
    }
  }

  /**
   * Verify session cookie
   */
  async verifySessionCookie(sessionCookie: string): Promise<DecodedToken> {
    if (!this.isInitialized || !this.auth) {
      throw new UnauthorizedException('Firebase auth service not available');
    }

    try {
      const decodedClaims = await this.auth.verifySessionCookie(sessionCookie, true);
      return {
        email: decodedClaims.email,
        ...decodedClaims,
      };
    } catch (error) {
      this.logger.error(`❌ Session cookie verification failed:`, error.message);
      throw new UnauthorizedException('Invalid session');
    }
  }

  // ==================== NOTIFICATION METHODS ====================

  /**
   * Send notification to multiple devices
   */
  async sendToMultipleDevices(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<admin.messaging.BatchResponse> {
    if (!this.isInitialized || !this.messaging) {
      throw new Error('Firebase is not initialized');
    }

    try {
      // Validate and clean tokens
      const validTokens = tokens.filter(token => 
        token && token.length > 0
      );
      
      if (validTokens.length === 0) {
        throw new Error('No valid device tokens provided');
      }

      const message: admin.messaging.MulticastMessage = {
        tokens: validTokens,
        notification: { title, body },
        data,
        android: { 
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'high_importance_channel',
          }
        },
        apns: {
          payload: {
            aps: {
              alert: { title, body },
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await this.messaging.sendEachForMulticast(message);
      
      this.logger.log(
        `📱 Sent to ${validTokens.length} devices: ${response.successCount} success, ${response.failureCount} failed`,
      );
      
      // Log failures
      if (response.failureCount > 0) {
        response.responses.forEach((resp, index) => {
          if (!resp.success && resp.error) {
            this.logger.warn(`Failed token ${validTokens[index].substring(0, 10)}...: ${resp.error.message}`);
          }
        });
      }
      
      return response;
    } catch (error) {
      this.logger.error('❌ Error sending notifications:', error.message);
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
    if (!this.isInitialized || !this.messaging) {
      throw new Error('Firebase is not initialized');
    }

    try {
      const message: admin.messaging.Message = {
        token,
        notification: { title, body },
        data,
      };
      
      const response = await this.messaging.send(message);
      this.logger.log(`📱 Sent to device: ${response}`);
      return response;
    } catch (error) {
      this.logger.error('❌ Error sending to device:', error.message);
      throw error;
    }
  }

  /**
   * Send notification to a topic
   */
  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<string> {
    if (!this.isInitialized || !this.messaging) {
      throw new Error('Firebase is not initialized');
    }

    try {
      // Ensure proper topic format
      const formattedTopic = topic.startsWith('/topics/') ? topic : `/topics/${topic}`;
      
      const message: admin.messaging.Message = {
        topic: formattedTopic,
        notification: { title, body },
        data,
      };
      
      const response = await this.messaging.send(message);
      this.logger.log(`📱 Sent to topic "${topic}": ${response}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Error sending to topic "${topic}":`, error.message);
      throw error;
    }
  }

  /**
   * Check if Firebase is ready
   */
  isFirebaseReady(): boolean {
    return this.isInitialized && !!this.messaging && !!this.auth;
  }

  /**
   * Simple send method (alias for sendToMultipleDevices)
   */
  async sendPush(tokens: string[], title: string, body: string): Promise<admin.messaging.BatchResponse> {
    return this.sendToMultipleDevices(tokens, title, body);
  }
}