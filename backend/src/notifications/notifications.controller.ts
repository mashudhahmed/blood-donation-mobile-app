import { Controller, Post, Body, Get } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Post('send')
  async sendNotification(
    @Body() body: { 
      // Accept both formats
      tokens?: string[];
      donors?: Array<{ uid: string; fcmToken: string }>;
      title: string;
      body: string;
    },
  ) {
    console.log('🔍 Controller received:', {
      hasTokens: !!body.tokens,
      tokenCount: body.tokens?.length || 0,
      hasDonors: !!body.donors,
      donorCount: body.donors?.length || 0,
      title: body.title,
      body: body.body
    });

    return this.notificationsService.sendNotification(body);
  }

  // Optional: Health check endpoint
  @Get('health')
  healthCheck() {
    return { status: 'OK', service: 'Notification Service' };
  }
}