import { Controller, Post, Body, Get } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

// ✅ LOCAL interface (no external import needed)
interface DonorTarget {
  uid: string;
  fcmToken: string;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Post('send')
  async sendNotification(
    @Body()
    body: {
      donors: DonorTarget[];
      title: string;
      body: string;
    },
  ) {
    return this.notificationsService.sendNotification(
      body.donors,
      body.title,
      body.body,
    );
  }

  // ✅ Health check
  @Get('health')
  healthCheck() {
    return {
      status: 'OK',
      service: 'Notification Service',
    };
  }
}
