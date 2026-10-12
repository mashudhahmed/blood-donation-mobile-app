import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles, UserRole } from '../auth/roles.decorator';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get high-level platform analytics & stats' })
  async getMetrics() {
    return this.adminService.getPlatformMetrics();
  }

  @Get('organizations')
  @ApiOperation({ summary: 'List registered hospitals & blood banks with verification status' })
  @ApiQuery({ name: 'type', required: false, enum: ['hospital', 'bloodbank'] })
  async getOrganizations(@Query('type') type?: 'hospital' | 'bloodbank') {
    return this.adminService.getOrganizations(type);
  }

  @Patch('organizations/:id/verify')
  @ApiOperation({ summary: 'Approve, reject, or update organization verification' })
  async updateVerification(
    @Param('id') id: string,
    @Body() body: { type: 'hospital' | 'bloodbank'; status: 'VERIFIED' | 'REJECTED' | 'PENDING'; notes?: string },
  ) {
    return this.adminService.updateOrganizationVerification(
      id,
      body.type,
      body.status,
      body.notes,
    );
  }

  @Patch('verify/:type/:id')
  @ApiOperation({ summary: 'Alias for organization verification update' })
  async updateVerificationAlias(
    @Param('type') type: 'hospital' | 'bloodbank',
    @Param('id') id: string,
    @Body() body: { verified?: boolean; status?: 'VERIFIED' | 'REJECTED' | 'PENDING'; notes?: string },
  ) {
    const status = body.status || (body.verified ? 'VERIFIED' : 'PENDING');
    return this.adminService.updateOrganizationVerification(id, type, status, body.notes);
  }

  @Get('donors')
  @ApiOperation({ summary: 'Search and filter registered blood donors' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'bloodGroup', required: false })
  @ApiQuery({ name: 'district', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getDonors(
    @Query('search') search?: string,
    @Query('bloodGroup') bloodGroup?: string,
    @Query('district') district?: string,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getDonors({ search, bloodGroup, district, limit });
  }

  @Patch('donors/:id/status')
  @ApiOperation({ summary: 'Toggle donor availability or active status' })
  async updateDonorStatus(
    @Param('id') id: string,
    @Body() body: { isAvailable: boolean },
  ) {
    return this.adminService.updateDonorStatus(id, body.isAvailable);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Retrieve recent platform activity & requisition audit logs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAuditLogs(@Query('limit') limit?: number) {
    return this.adminService.getAuditLogs(limit || 20);
  }
}
