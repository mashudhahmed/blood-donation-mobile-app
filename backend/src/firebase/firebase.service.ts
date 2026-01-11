import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  public firestore: admin.firestore.Firestore;
  public messaging: admin.messaging.Messaging;
  public admin: typeof admin;

  constructor() {
    this.initializeFirebase();
  }

  onModuleInit() {
    console.log('✅ FirebaseService initialized');
  }

  private initializeFirebase() {
    try {
      // Check if already initialized
      if (admin.apps.length > 0) {
        console.log('✅ Firebase already initialized');
        this.firestore = admin.firestore();
        this.messaging = admin.messaging();
        return;
      }

      // Try to parse service account from environment variable
      let serviceAccount: any;
      
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
          // Parse the JSON string
          serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
          
          // Fix newline characters in private key
          if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
          }
          
          console.log('✅ Firebase Service Account parsed from FIREBASE_SERVICE_ACCOUNT');
        } catch (parseError) {
          console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:', parseError);
          throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT JSON');
        }
      } else if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      ) {
        // Use individual environment variables
        serviceAccount = {
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        };
        console.log('✅ Firebase credentials from individual env vars');
      } else {
        throw new Error(
          '❌ Firebase credentials not found. Set either FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY'
        );
      }

      // Initialize Firebase Admin
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id || serviceAccount.projectId}.firebaseio.com`,
      });

      // Initialize services
      this.firestore = admin.firestore();
      this.messaging = admin.messaging();
      this.admin = admin;

      // Optional: Configure Firestore settings
      this.firestore.settings({
        ignoreUndefinedProperties: true,
      });

      console.log('✅ Firebase Admin SDK initialized successfully');
      console.log(`✅ Project: ${serviceAccount.project_id || serviceAccount.projectId}`);
      
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error.message);
      
      // Provide helpful error messages
      if (error.message.includes('private key')) {
        console.error('⚠️  Check that private key has proper newline characters (\\n)');
      }
      if (error.message.includes('credentials')) {
        console.error('⚠️  Verify environment variables are set correctly');
      }
      
      throw error;
    }
  }

  // Helper to check if Firebase is initialized
  isInitialized(): boolean {
    return admin.apps.length > 0;
  }
}