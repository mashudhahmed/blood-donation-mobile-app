import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

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
  constructor(private notificationsService: NotificationsService) {}

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

  @Get('stats')
  async getStats() {
    return this.notificationsService.getStats();
  }

  // ✅ NEW: Get matching statistics for specific district/blood group
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