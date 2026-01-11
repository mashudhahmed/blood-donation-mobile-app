// src/notifications/notifications.controller.ts
import { Body, Controller, Post, Get, HttpException, HttpStatus } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { FieldValue } from 'firebase-admin/firestore';
import { BloodCompatibilityService } from '../blood/blood-compatibility.service';
import { DonorMatchingService } from '../matching/donor-matching.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly donorMatchingService: DonorMatchingService,
    private readonly bloodCompatibilityService: BloodCompatibilityService
  ) {}

  @Post('blood-request')
  async sendBloodRequestNotification(@Body() body: {
    requestId?: string;
    bloodGroup: string;
    district: string;
    hospitalName: string;
    urgency?: string;
    patientName?: string;
    contactPhone?: string;
    units?: number;
    requesterId?: string;
  }) {
    // Validate required fields
    if (!body.bloodGroup || !body.district || !body.hospitalName) {
      throw new HttpException('Missing required fields', HttpStatus.BAD_REQUEST);
    }

    // Generate requestId if not provided
    const requestId = body.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return this.notificationsService.notifyCompatibleDonors({
      ...body,
      requestId
    });
  }

  @Post('test-notification')
  async sendTestNotification(@Body() body: { token: string; message?: string }) {
    if (!body.token) {
      throw new HttpException('FCM token is required', HttpStatus.BAD_REQUEST);
    }
    
    return this.notificationsService.sendTestNotification(
      body.token, 
      body.message || 'This is a test notification from Blood Donation System'
    );
  }

  @Post('register-token')
  async registerFCMToken(@Body() body: {
    donorId: string;
    fcmToken: string;
    deviceType?: string;
    appVersion?: string;
  }) {
    if (!body.donorId || !body.fcmToken) {
      throw new HttpException('Donor ID and FCM token are required', HttpStatus.BAD_REQUEST);
    }

    try {
      const updateData = {
        fcmToken: body.fcmToken,
        updatedAt: FieldValue.serverTimestamp(),
        ...(body.deviceType && { deviceType: body.deviceType }),
        ...(body.appVersion && { appVersion: body.appVersion })
      };

      // Use the service method instead of accessing private property
      await this.notificationsService.updateDonorToken(body.donorId, updateData);

      return {
        success: true,
        message: 'Token registered successfully',
        donorId: body.donorId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error registering token:', error);
      throw new HttpException('Failed to register token', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // NEW: Endpoint for Android app to save FCM token
  @Post('save-token')
  async saveFCMToken(@Body() body: {
    userId: string;
    fcmToken: string;
    userType?: string;
    deviceId?: string;
  }) {
    try {
      if (!body.userId || !body.fcmToken) {
        throw new HttpException('User ID and FCM token are required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.notificationsService.saveFCMToken(body);

      return {
        success: true,
        message: 'FCM token saved successfully',
        userId: body.userId,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error saving FCM token:', error);
      throw new HttpException('Failed to save token', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('health')
  async healthCheck() {
    const isInitialized = await this.notificationsService.checkFirebaseStatus();
    
    return {
      status: 'OK',
      service: 'Notifications Service',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      firebase: isInitialized ? 'connected' : 'disconnected',
      endpoints: [
        'POST /notifications/blood-request',
        'POST /notifications/test-notification',
        'POST /notifications/register-token',
        'POST /notifications/save-token',
        'GET /notifications/health',
        'GET /notifications/debug',
        'POST /notifications/matching-stats'
      ]
    };
  }

  // NEW: Debug endpoint
  @Get('debug')
  async debugInfo() {
    const isFirebaseInitialized = await this.notificationsService.checkFirebaseStatus();
    
    return {
      status: 'Backend is running',
      timestamp: new Date().toISOString(),
      firebase: isFirebaseInitialized ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        bloodRequest: 'POST /notifications/blood-request',
        saveToken: 'POST /notifications/save-token',
        registerToken: 'POST /notifications/register-token',
        testNotification: 'POST /notifications/test-notification',
        health: 'GET /notifications/health',
        debug: 'GET /notifications/debug',
        matchingStats: 'POST /notifications/matching-stats'
      }
    };
  }

  // NEW: Get matching stats
  @Post('matching-stats')
  async getMatchingStats(
    @Body() body: { bloodGroup: string; district: string }
  ) {
    if (!body.bloodGroup || !body.district) {
      throw new HttpException('Blood group and district are required', HttpStatus.BAD_REQUEST);
    }

    try {
      const compatibleDonors = await this.donorMatchingService
        .findCompatibleDonors(body.bloodGroup, body.district);

      const compatibleTypes = this.bloodCompatibilityService
        .getCompatibleDonors(body.bloodGroup);

      return {
        success: true,
        bloodGroup: body.bloodGroup,
        district: body.district,
        eligibleDonors: compatibleDonors.length,
        compatibleBloodTypes: compatibleTypes,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting matching stats:', error);
      throw new HttpException('Failed to get matching stats', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}