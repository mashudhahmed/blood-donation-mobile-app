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

  // ==============================
  // SEND BLOOD REQUEST NOTIFICATION
  // ==============================
  @Post('blood-request')
  async sendBloodRequestNotification(
    @Body()
    body: {
      requestId?: string;
      bloodGroup: string;
      district: string;
      hospitalName: string;
      urgency?: string;
      patientName?: string;
      contactPhone?: string;
      units?: number;
      requesterId?: string;
    },
  ) {
    if (!body.bloodGroup || !body.district || !body.hospitalName) {
      throw new HttpException(
        'Missing required fields',
        HttpStatus.BAD_REQUEST,
      );
    }

    const requestId =
      body.requestId ||
      `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    return this.notificationsService.notifyCompatibleDonors({
      ...body,
      requestId,
    });
  }

  // ==============================
  // TEST NOTIFICATION (DATA-ONLY)
  // ==============================
  @Post('test-notification')
  async sendTestNotification(@Body() body: { token: string }) {
    if (!body.token) {
      throw new HttpException(
        'FCM token is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const messageId =
      await this.notificationsService.sendTestNotification(body.token);

    return {
      success: true,
      message: 'Test notification sent',
      messageId,
      timestamp: new Date().toISOString(),
    };
  }

  // ==============================
  // SAVE FCM TOKEN (ANDROID USES THIS)
  // ==============================
  @Post('save-token')
  async saveFCMToken(
    @Body()
    body: {
      userId: string;
      fcmToken: string;
      deviceId?: string;
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

  // ==============================
  // BACKWARD-COMPAT TOKEN REGISTER
  // ==============================
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

  // ==============================
  // HEALTH CHECK
  // ==============================
  @Get('health')
  async healthCheck() {
    const isInitialized =
      await this.notificationsService.checkFirebaseStatus();

    return {
      status: 'OK',
      service: 'Notifications Service',
      firebase: isInitialized ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }

  // ==============================
  // DEBUG INFO
  // ==============================
  @Get('debug')
  async debugInfo() {
    const firebase =
      await this.notificationsService.checkFirebaseStatus();

    return {
      status: 'Backend is running',
      firebase: firebase ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    };
  }

  // ==============================
  // MATCHING STATS
  // ==============================
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

    const compatibleDonors =
      await this.donorMatchingService.findCompatibleDonors(
        body.bloodGroup,
        body.district,
      );

    const compatibleTypes =
      this.bloodCompatibilityService.getCompatibleDonors(
        body.bloodGroup,
      );

    return {
      success: true,
      bloodGroup: body.bloodGroup,
      district: body.district,
      eligibleDonors: compatibleDonors.length,
      compatibleBloodTypes: compatibleTypes,
      timestamp: new Date().toISOString(),
    };
  }
}
