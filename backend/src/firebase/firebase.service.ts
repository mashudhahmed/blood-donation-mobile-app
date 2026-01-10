import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private messaging: admin.messaging.Messaging | null = null;
  private firestore: admin.firestore.Firestore | null = null;
  private isInitialized = false;

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      console.log('🔍 DEBUG: Starting Firebase initialization...');
      
      // OPTION 1: Try to get from single JSON variable (most reliable)
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
      let serviceAccount: any = null;

      if (serviceAccountJson) {
        console.log('🔍 DEBUG: Found FIREBASE_SERVICE_ACCOUNT JSON');
        try {
          serviceAccount = JSON.parse(serviceAccountJson);
          console.log('✅ Parsed service account for project:', serviceAccount.project_id);
        } catch (parseError) {
          console.error('❌ ERROR: Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', parseError.message);
          console.error('❌ Raw JSON start:', serviceAccountJson.substring(0, 100) + '...');
        }
      }

      // OPTION 2: If not in JSON, try separate environment variables
      if (!serviceAccount) {
        console.log('🔍 DEBUG: Trying separate environment variables...');
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (projectId && clientEmail && privateKey) {
          serviceAccount = {
            projectId,
            clientEmail,
            privateKey
          };
          console.log('✅ Using separate environment variables');
        }
      }

      // If still missing, show detailed error
      if (!serviceAccount) {
        console.warn('⚠️ Firebase environment variables are missing. Notifications will not work.');
        console.log('🔍 DEBUG: Missing variables:');
        console.log('  - FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'EXISTS' : 'NOT SET');
        console.log('  - FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'EXISTS' : 'NOT SET');
        console.log('  - FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'EXISTS' : 'NOT SET');
        console.log('  - FIREBASE_SERVICE_ACCOUNT:', process.env.FIREBASE_SERVICE_ACCOUNT ? 'EXISTS' : 'NOT SET');
        this.isInitialized = false;
        return;
      }

      // Check if already initialized
      if (admin.apps.length === 0) {
        console.log('🔍 DEBUG: Initializing Firebase Admin SDK...');
        
        // Initialize with either format
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id || serviceAccount.projectId,
          databaseURL: `https://${serviceAccount.project_id || serviceAccount.projectId}.firebaseio.com`
        });
        
        console.log('✅ Firebase Admin initialized successfully');
      } else {
        console.log('ℹ️ Firebase already initialized');
      }

      // ✅ INITIALIZE BOTH SERVICES
      this.messaging = admin.messaging();
      this.firestore = admin.firestore();
      
      // Configure Firestore settings
      this.firestore.settings({
        ignoreUndefinedProperties: true,
      });
      
      this.isInitialized = true;
      console.log('✅ Firebase services ready: Messaging ✅ Firestore ✅');
      
    } catch (error) {
      console.error('❌ Error initializing Firebase:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.log('⚠️ Server will run without Firebase notifications');
      this.isInitialized = false;
    }
  }

  // 🔥 GET MESSAGING SERVICE
  getMessaging() {
    if (!this.isInitialized || !this.messaging) {
      throw new Error('Firebase not initialized. Check your Firebase credentials.');
    }
    return this.messaging;
  }

  // 🔥 NEW: GET FIRESTORE SERVICE (Required by NotificationsService)
  getFirestore() {
    if (!this.isInitialized || !this.firestore) {
      throw new Error('Firestore not initialized. Check your Firebase credentials.');
    }
    return this.firestore;
  }

  // 🔥 CHECK IF FIREBASE IS READY
  isFirebaseReady(): boolean {
    return this.isInitialized && this.messaging !== null && this.firestore !== null;
  }

  // 🔥 GET FIREBASE ADMIN APP (Optional)
  getAdminApp() {
    if (!this.isInitialized) {
      throw new Error('Firebase not initialized.');
    }
    return admin.app();
  }

  // 🔥 TEST FIRESTORE CONNECTION
  async testFirestoreConnection(): Promise<boolean> {
    if (!this.firestore) return false;
    
    try {
      const testRef = this.firestore.collection('_test').doc('connection');
      await testRef.set({ test: new Date().toISOString() });
      await testRef.delete();
      console.log('✅ Firestore connection test passed');
      return true;
    } catch (error) {
      console.error('❌ Firestore connection test failed:', error.message);
      return false;
    }
  }

  // 🔥 TEST FIREBASE CONNECTION
  async testFirebaseConnection(): Promise<boolean> {
    if (!this.isInitialized) return false;
    
    try {
      const app = admin.app();
      console.log('✅ Firebase connection test passed. App:', app.name);
      
      // Test both services
      const messagingTest = !!this.messaging;
      const firestoreTest = !!this.firestore;
      
      console.log('✅ Services check:', {
        messaging: messagingTest ? '✅' : '❌',
        firestore: firestoreTest ? '✅' : '❌'
      });
      
      return messagingTest && firestoreTest;
    } catch (error) {
      console.error('❌ Firebase connection test failed:', error.message);
      return false;
    }
  }
}