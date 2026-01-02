import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private messaging: admin.messaging.Messaging | null = null;
  private isInitialized = false;

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      console.log('🔍 DEBUG: Starting Firebase initialization...');
      
      // OPTION 1: Try to get from single JSON variable (most reliable)
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
      let projectId: string | undefined;
      let clientEmail: string | undefined;
      let privateKey: string | undefined;

      if (serviceAccountJson) {
        console.log('🔍 DEBUG: Found FIREBASE_SERVICE_ACCOUNT JSON');
        try {
          const serviceAccount = JSON.parse(serviceAccountJson);
          projectId = serviceAccount.projectId;
          clientEmail = serviceAccount.clientEmail;
          privateKey = serviceAccount.privateKey;
        } catch (parseError) {
          console.error('❌ ERROR: Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', parseError.message);
        }
      }

      // OPTION 2: If not in JSON, try separate environment variables
      if (!projectId || !clientEmail || !privateKey) {
        console.log('🔍 DEBUG: Trying separate environment variables...');
        projectId = process.env.FIREBASE_PROJECT_ID;
        clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        privateKey = process.env.FIREBASE_PRIVATE_KEY;
      }

      // OPTION 3: If still not found, try legacy variable names
      if (!projectId || !clientEmail || !privateKey) {
        console.log('🔍 DEBUG: Trying legacy variable names...');
        projectId = process.env.GOOGLE_PROJECT_ID || process.env.PROJECT_ID;
        clientEmail = process.env.GOOGLE_CLIENT_EMAIL || process.env.CLIENT_EMAIL;
        privateKey = process.env.GOOGLE_PRIVATE_KEY || process.env.PRIVATE_KEY;
      }

      // Debug log what we found
      console.log('🔍 DEBUG: Environment variables found:');
      console.log('  - projectId:', projectId ? '✓' : '✗');
      console.log('  - clientEmail:', clientEmail ? '✓' : '✗');
      console.log('  - privateKey:', privateKey ? '✓' : '✗');

      // If still missing, show detailed error
      if (!projectId || !clientEmail || !privateKey) {
        console.warn('⚠️ Firebase environment variables are missing. Notifications will not work.');
        console.log('🔍 DEBUG: Missing variables:');
        console.log('  - FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'EXISTS' : 'NOT SET');
        console.log('  - FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'EXISTS' : 'NOT SET');
        console.log('  - FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'EXISTS' : 'NOT SET');
        console.log('  - FIREBASE_SERVICE_ACCOUNT:', process.env.FIREBASE_SERVICE_ACCOUNT ? 'EXISTS' : 'NOT SET');
        this.isInitialized = false;
        return;
      }

      // Clean up private key (replace escaped newlines with actual newlines)
      const cleanPrivateKey = privateKey.replace(/\\n/g, '\n');
      
      // Check if already initialized
      if (admin.apps.length === 0) {
        console.log('🔍 DEBUG: Initializing Firebase Admin SDK...');
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: projectId,
            clientEmail: clientEmail,
            privateKey: cleanPrivateKey,
          }),
        });
        console.log('✅ Firebase Admin initialized successfully');
      } else {
        console.log('ℹ️ Firebase already initialized');
      }

      this.messaging = admin.messaging();
      this.isInitialized = true;
      console.log('✅ Firebase messaging service ready');
      
    } catch (error) {
      console.error('❌ Error initializing Firebase:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.log('⚠️ Server will run without Firebase notifications');
      this.isInitialized = false;
    }
  }

  getMessaging() {
    if (!this.isInitialized || !this.messaging) {
      throw new Error('Firebase not initialized. Check your Firebase credentials.');
    }
    return this.messaging;
  }

  isFirebaseReady(): boolean {
    return this.isInitialized && this.messaging !== null;
  }

  // Helper method to test Firebase connection
  async testFirebaseConnection(): Promise<boolean> {
    if (!this.isInitialized || !this.messaging) {
      return false;
    }
    
    try {
      // Try to get app name as a simple test
      const app = admin.app();
      console.log('✅ Firebase connection test passed. App:', app.name);
      return true;
    } catch (error) {
      console.error('❌ Firebase connection test failed:', error.message);
      return false;
    }
  }
}