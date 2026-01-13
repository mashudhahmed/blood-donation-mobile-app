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
      medicalName?: string;  // ✅ Accept medicalName from Android
      urgency?: string;
      patientName?: string;
      contactPhone?: string;
      units?: number;
      requesterId?: string;  // ✅ REQUIRED: To exclude requester
    },
  ) {
    console.log('📱 Blood Request API Called:', {
      bloodGroup: body.bloodGroup,
      district: body.district,
      requesterId: body.requesterId,
      hospital: body.hospitalName || body.hospital || body.medicalName
    });

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

    // ✅ Validate requesterId is provided
    if (!body.requesterId) {
      throw new HttpException(
        'Requester ID is required to exclude self from notifications',
        HttpStatus.BAD_REQUEST,
      );
    }

    // ✅ NORMALIZE URGENCY (accept any case)
    const urgency = (body.urgency || 'normal').toLowerCase();
    const normalizedUrgency = urgency === 'high' ? 'high' : 'normal';

    const requestId =
      body.requestId ||
      `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    console.log('📊 Processing blood request:', {
      requestId,
      requesterId: body.requesterId,
      bloodGroup: body.bloodGroup,
      district: body.district,
      hospital: hospitalName,
      urgency: normalizedUrgency
    });

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
      deviceType?: string;
      appVersion?: string;
      isLoggedIn?: boolean;  // ✅ NEW: Accept login status
    },
  ) {
    console.log('📱 Save Token API Called:', {
      userId: body.userId,
      deviceId: body.deviceId,
      tokenLength: body.fcmToken?.length,
      isLoggedIn: body.isLoggedIn
    });

    if (!body.userId || !body.fcmToken) {
      throw new HttpException(
        'User ID and FCM token are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (body.fcmToken.length < 10 || !body.fcmToken.includes(':')) {
      throw new HttpException(
        'Invalid FCM token format',
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.notificationsService.saveFCMToken(body);

    return {
      success: true,
      message: 'FCM token saved successfully',
      userId: body.userId,
      deviceId: body.deviceId || 'unknown',
      compoundTokenId: result.compoundTokenId,
      isLoggedIn: body.isLoggedIn !== false,
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
      deviceId?: string;
      isLoggedIn?: boolean;  // ✅ NEW: Accept login status
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
      deviceId: body.deviceId,
      deviceType: body.deviceType,
      appVersion: body.appVersion,
      updatedAt: new Date(),
      isLoggedIn: body.isLoggedIn !== false,  // ✅ Pass login status
    });

    return {
      success: true,
      message: 'Token registered successfully',
      donorId: body.donorId,
      deviceId: body.deviceId,
      isLoggedIn: body.isLoggedIn !== false,
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
      features: {
        accountSpecificNotifications: true,
        requesterExclusion: true,
        deviceTracking: true,
        loggedOutNotifications: true,  // ✅ NEW: Logged-out donors can receive notifications
        availabilityFiltering: true,
      }
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
        logout: 'POST /notifications/logout',
        login: 'POST /notifications/login',
      },
      features: 'Account-specific notifications with device tracking, logged-out donors support'
    };
  }

  @Post('test-notification')
  async sendTestNotification(@Body() body: { token: string, userId?: string }) {
    if (!body.token) {
      throw new HttpException('Token is required', HttpStatus.BAD_REQUEST);
    }

    try {
      await this.notificationsService.sendTestNotification(body.token, body.userId);
      return {
        success: true,
        message: 'Test notification sent successfully',
        recipientUserId: body.userId
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
    @Body() body: { bloodGroup: string; district: string; requesterId?: string },
  ) {
    if (!body.bloodGroup || !body.district) {
      throw new HttpException(
        'Blood group and district are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const compatibleDonors = await this.donorMatchingService.findCompatibleDonors(
        body.bloodGroup,
        body.district,
        50,
        body.requesterId  // Pass requesterId for exclusion
      );

      const compatibleBloodTypes =
        this.bloodCompatibilityService.getCompatibleDonors(body.bloodGroup);

      // Get requester's device info if provided
      let requesterDevices: string[] = [];
      if (body.requesterId) {
        const donor = await this.notificationsService['firebaseService'].firestore
          .collection('donors')
          .where('userId', '==', body.requesterId)
          .limit(1)
          .get();
        
        if (!donor.empty) {
          const donorData = donor.docs[0].data();
          if (donorData.deviceId) {
            requesterDevices = [donorData.deviceId];
          }
        }
      }

      const loggedInDonors = compatibleDonors.filter(d => d.isLoggedIn);
      const loggedOutDonors = compatibleDonors.filter(d => !d.isLoggedIn);

      return {
        bloodGroup: body.bloodGroup,
        district: body.district,
        totalCompatibleDonors: compatibleDonors.length,
        eligibleDonors: compatibleDonors.filter(d => d.fcmToken && d.isAvailable).length,
        loggedInDonors: loggedInDonors.length,
        loggedOutDonors: loggedOutDonors.length,
        compatibleBloodTypes,
        requesterId: body.requesterId || 'not_provided',
        requesterDevices,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get matching stats: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('validate-token')
  async validateToken(@Body() body: { userId: string, deviceId?: string }) {
    if (!body.userId) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const db = this.notificationsService['firebaseService'].firestore;
      let query = db.collection('donors').where('userId', '==', body.userId);
      
      if (body.deviceId) {
        query = query.where('deviceId', '==', body.deviceId);
      }

      const snapshot = await query.limit(1).get();

      if (snapshot.empty) {
        return {
          hasToken: false,
          message: 'No donor found with this user ID',
          userId: body.userId,
          deviceId: body.deviceId
        };
      }

      const donor = snapshot.docs[0].data();
      const hasToken = !!donor.fcmToken && donor.hasFcmToken === true;
      
      return {
        hasToken,
        userId: body.userId,
        deviceId: donor.deviceId || body.deviceId,
        compoundTokenId: donor.compoundTokenId,
        isAvailable: donor.isAvailable,
        isLoggedIn: donor.isLoggedIn !== false,  // ✅ Include login status
        notificationEnabled: donor.notificationEnabled,
        lastActive: donor.lastActive || donor.updatedAt,
        message: hasToken ? 'Valid token found' : 'No valid token found'
      };
    } catch (error) {
      throw new HttpException(
        `Failed to validate token: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('logout')
  async markUserAsLoggedOut(
    @Body() body: { userId: string, deviceId?: string }
  ) {
    if (!body.userId) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    await this.notificationsService.markUserAsLoggedOut(body.userId, body.deviceId);

    return {
      success: true,
      message: 'User marked as logged out successfully. FCM token preserved for notifications.',
      userId: body.userId,
      deviceId: body.deviceId,
      timestamp: new Date().toISOString(),
      note: 'User will still receive notifications if marked as available (isAvailable: true)'
    };
  }

  @Post('login')
  async markUserAsLoggedIn(
    @Body() body: { userId: string, deviceId?: string }
  ) {
    if (!body.userId) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    await this.notificationsService.markUserAsLoggedIn(body.userId, body.deviceId);

    return {
      success: true,
      message: 'User marked as logged in successfully',
      userId: body.userId,
      deviceId: body.deviceId,
      timestamp: new Date().toISOString(),
    };
  }
}