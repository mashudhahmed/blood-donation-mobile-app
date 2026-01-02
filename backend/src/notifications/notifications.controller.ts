import { Controller, Post, Body, Get } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Post('send')
  async sendNotification(
    @Body() body: { tokens: string[]; title: string; body: string },
  ) {
    return this.notificationsService.sendNotification(
      body.tokens,
      body.title,
      body.body,
    );
  }

  // Optional: Health check endpoint
  @Get('health')
  healthCheck() {
    return { status: 'OK', service: 'Notification Service' };
  }
}