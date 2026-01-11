import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { FirebaseService } from '../firebase/firebase.service';
import * as admin from 'firebase-admin';

interface BloodRequestDto {
  patientName: string;
  hospital: string;
  bloodGroup: string;
  units: number;
  district: string;
  contactPhone: string;
  urgency?: 'normal' | 'urgent' | 'critical';
  notes?: string;
  requesterId: string;
}

@Controller('notifications')
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private firebaseService: FirebaseService
  ) {}

  // ✅ EXISTING ENDPOINT - KEEP AS IS
  @Post('blood-request')
  async createBloodRequest(@Body() request: BloodRequestDto) {
    // Validate required fields
    if (!request.patientName || !request.hospital || !request.bloodGroup || 
        !request.district || !request.requesterId) {
      return {
        success: false,
        message: 'Missing required fields: patientName, hospital, bloodGroup, district, requesterId are required'
      };
    }

    // Set default values
    if (!request.units || request.units < 1) request.units = 1;
    if (!request.urgency) request.urgency = 'normal';
    
    return this.notificationsService.createBloodRequest(request);
  }

  // ✅ NEW: SAVE FCM TOKEN ENDPOINT (ADD THIS)
  @Post('save-token')
  async saveFcmToken(
    @Body() body: { userId: string; fcmToken: string; userType?: string }
  ) {
    try {
      const firestore = this.firebaseService.getFirestore();
      
      // Save to both collections for flexibility
      const userData = {
        fcmToken: body.fcmToken,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        hasFcmToken: true
      };
      
      // Try to save to donors collection (your main collection)
      await firestore
        .collection('donors')
        .doc(body.userId)
        .set(userData, { merge: true });
      
      // Also save to users collection for compatibility
      await firestore
        .collection('users')
        .doc(body.userId)
        .set(userData, { merge: true });
      
      console.log(`✅ FCM token saved for user: ${body.userId}`);
      
      return { 
        success: true, 
        message: 'FCM token saved successfully',
        userId: body.userId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error saving FCM token:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // ✅ EXISTING ENDPOINTS - KEEP AS IS
  @Get('stats')
  async getStats() {
    return this.notificationsService.getStats();
  }

  @Get('matching-stats')
  async getMatchingStats(
    @Query('district') district: string,
    @Query('bloodGroup') bloodGroup: string
  ) {
    if (!district || !bloodGroup) {
      return {
        success: false,
        message: 'Both district and bloodGroup query parameters are required'
      };
    }
    
    return this.notificationsService.getMatchingStats(district, bloodGroup);
  }

  @Get('health')
  healthCheck() {
    return {
      status: 'healthy',
      service: 'blood-donation-notifications',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  }
}