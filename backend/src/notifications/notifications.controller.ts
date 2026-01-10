import { Controller, Post, Body, Get } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Post('send')
  async sendNotification(
    @Body() body: { 
      // ✅ ALL FORATS SUPPORTED:
      tokens?: string[];
      userIds?: string[];           // NEW: For direct user IDs
      donors?: Array<{ uid: string; fcmToken: string }>;  // OLD: Donor format
      title: string;
      body: string;
      data?: Record<string, any>;   // Optional: Additional data for Android
    },
  ) {
    console.log('🔍 Controller received:', {
      hasTokens: !!body.tokens,
      tokenCount: body.tokens?.length || 0,
      hasUserIds: !!body.userIds,
      userIdCount: body.userIds?.length || 0,
      hasDonors: !!body.donors,
      donorCount: body.donors?.length || 0,
      title: body.title,
      body: body.body,
      hasData: !!body.data
    });

    // ✅ Pass all data to service
    return this.notificationsService.sendNotification({
      tokens: body.tokens,
      userIds: body.userIds,
      donors: body.donors,
      title: body.title,
      body: body.body,
      data: body.data || {}
    });
  }

  // Optional: Health check endpoint
  @Get('health')
  healthCheck() {
    return { status: 'OK', service: 'Notification Service' };
  }
}