// src/notifications/notifications.controller.ts
import {
  Body,
  Controller,
  Post,
  Get,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { BloodCompatibilityService } from '../blood/blood-compatibility.service';
import { DonorMatchingService } from '../matching/donor-matching.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly donorMatchingService: DonorMatchingService,
    private readonly bloodCompatibilityService: BloodCompatibilityService,
  ) {}

  @Post('blood-request')
  async sendBloodRequestNotification(
    @Body()
    body: {
      requestId?: string;
      bloodGroup: string;
      district: string;
      hospitalName?: string;
      hospital?: string;
      medicalName?: string;  // ✅ Added: Accept medicalName from Android
      urgency?: string;
      patientName?: string;
      contactPhone?: string;
      units?: number;
      requesterId?: string;
    },
  ) {
    if (!body.bloodGroup || !body.district) {
      throw new HttpException(
        'Blood group and district are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    // ✅ ACCEPT ALL HOSPITAL FIELDS (medicalName from Android)
    const hospitalName = body.hospitalName || body.hospital || body.medicalName;
    if (!hospitalName) {
      throw new HttpException(
        'Hospital name is required (use hospitalName, hospital, or medicalName field)',
        HttpStatus.BAD_REQUEST,
      );
    }

    // ✅ NORMALIZE URGENCY (accept any case)
    const urgency = (body.urgency || 'normal').toLowerCase();
    const normalizedUrgency = urgency === 'high' ? 'high' : 'normal';

    const requestId =
      body.requestId ||
      `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    return this.notificationsService.notifyCompatibleDonors({
      ...body,
      hospitalName,
      urgency: normalizedUrgency,
      requestId,
    });
  }

  @Post('save-token')
  async saveFCMToken(
    @Body()
    body: {
      userId: string;
      fcmToken: string;
      deviceId?: string;
      userType?: string;
    },
  ) {
    if (!body.userId || !body.fcmToken) {
      throw new HttpException(
        'User ID and FCM token are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.notificationsService.saveFCMToken(body);

    return {
      success: true,
      message: 'FCM token saved successfully',
      userId: body.userId,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('register-token')
  async registerFCMToken(
    @Body()
    body: {
      donorId: string;
      fcmToken: string;
      deviceType?: string;
      appVersion?: string;
    },
  ) {
    if (!body.donorId || !body.fcmToken) {
      throw new HttpException(
        'Donor ID and FCM token are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.notificationsService.updateDonorToken(body.donorId, {
      fcmToken: body.fcmToken,
      deviceType: body.deviceType,
      appVersion: body.appVersion,
      updatedAt: new Date(),
    });

    return {
      success: true,
      message: 'Token registered successfully',
      donorId: body.donorId,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  healthCheck() {
    return {
      status: 'healthy',
      service: 'notifications',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  @Get('debug')
  async debugInfo() {
    const firebaseStatus = await this.notificationsService.checkFirebaseStatus();
    return {
      status: firebaseStatus ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      firebase: firebaseStatus ? 'initialized' : 'not initialized',
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        bloodRequest: 'POST /notifications/blood-request',
        saveToken: 'POST /notifications/save-token',
        health: 'GET /notifications/health',
      },
    };
  }

  @Post('test-notification')
  async sendTestNotification(@Body() body: { token: string }) {
    if (!body.token) {
      throw new HttpException('Token is required', HttpStatus.BAD_REQUEST);
    }

    try {
      await this.notificationsService.sendTestNotification(body.token);
      return {
        success: true,
        message: 'Test notification sent successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to send test notification: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('matching-stats')
  async getMatchingStats(
    @Body() body: { bloodGroup: string; district: string },
  ) {
    if (!body.bloodGroup || !body.district) {
      throw new HttpException(
        'Blood group and district are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const compatibleDonors =
        await this.donorMatchingService.findCompatibleDonors(
          body.bloodGroup,
          body.district,
        );

      const compatibleBloodTypes =
        this.bloodCompatibilityService.getCompatibleDonors(body.bloodGroup);

      return {
        bloodGroup: body.bloodGroup,
        district: body.district,
        eligibleDonors: compatibleDonors.length,
        compatibleBloodTypes,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get matching stats: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}