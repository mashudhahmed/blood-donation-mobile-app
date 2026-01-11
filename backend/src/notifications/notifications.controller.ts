import { Body, Controller, Post, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('blood-request')
  async sendBloodRequestNotification(@Body() body: {
    requestId: string;
    bloodGroup: string;
    district: string;
    hospitalName: string;
    urgency?: string;
    patientName?: string;
  }) {
    // Validate required fields
    if (!body.requestId || !body.bloodGroup || !body.district || !body.hospitalName) {
      throw new HttpException('Missing required fields', HttpStatus.BAD_REQUEST);
    }

    return this.notificationsService.notifyCompatibleDonors(body);
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
    // This would need FirebaseService injected to update the donor document
    return {
      success: true,
      message: 'Token registration endpoint - implement database update',
      data: body
    };
  }

  @Get('health')
  async healthCheck() {
    return {
      status: 'OK',
      service: 'Notifications Service',
      timestamp: new Date().toISOString(),
      endpoints: [
        'POST /notifications/blood-request',
        'POST /notifications/test-notification',
        'POST /notifications/register-token',
        'GET /notifications/health'
      ]
    };
  }
}