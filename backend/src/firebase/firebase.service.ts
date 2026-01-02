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
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      
      // Check if env vars exist - DON'T THROW, just skip
      if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
        console.warn('⚠️ Firebase environment variables are missing. Notifications will not work.');
        this.isInitialized = false;
        return; // Just return, don't throw error!
      }

      // Check if already initialized
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
          }),
        });
        console.log('✅ Firebase Admin initialized successfully');
      }

      this.messaging = admin.messaging();
      this.isInitialized = true;
      
    } catch (error) {
      console.error('❌ Error initializing Firebase:', error.message);
      console.log('⚠️ Server will run without Firebase notifications');
      this.isInitialized = false;
      // Don't throw error - allow server to continue
    }
  }

  getMessaging() {
    if (!this.isInitialized || !this.messaging) {
      throw new Error('Firebase not initialized. Check your Firebase credentials.');
    }
    return this.messaging;
  }

  // Add this method to check if Firebase is ready
  isFirebaseReady(): boolean {
    return this.isInitialized && this.messaging !== null;
  }
}