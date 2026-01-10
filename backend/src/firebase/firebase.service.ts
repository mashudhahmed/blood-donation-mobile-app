import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private firestore: admin.firestore.Firestore;
  private messaging: admin.messaging.Messaging;

  async onModuleInit() {
    await this.initializeFirebase();
  }

  private async initializeFirebase() {
    try {
      if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
      }
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      
      // Fix private key formatting
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: serviceAccount.project_id,
            clientEmail: serviceAccount.client_email,
            privateKey: serviceAccount.private_key,
          }),
        });
        console.log('✅ Firebase initialized');
      }

      this.firestore = admin.firestore();
      this.messaging = admin.messaging();
      
    } catch (error) {
      console.error('❌ Firebase init failed:', error.message);
    }
  }

  getFirestore() {
    if (!this.firestore) throw new Error('Firebase not initialized');
    return this.firestore;
  }

  getMessaging() {
    if (!this.messaging) throw new Error('Firebase not initialized');
    return this.messaging;
  }
}