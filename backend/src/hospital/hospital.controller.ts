import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { HospitalService } from './hospital.service';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles, UserRole } from '../auth/roles.decorator';

@ApiTags('Hospitals')
@Controller('hospitals')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles(UserRole.HOSPITAL, UserRole.ADMIN)
@ApiBearerAuth()
export class HospitalController {
  constructor(private readonly hospitalService: HospitalService) {}

  @Post('requisitions')
  @ApiOperation({ summary: 'Create an emergency blood requisition & notify matching donors' })
  async createRequisition(@Req() req: any, @Body() dto: CreateRequisitionDto) {
    const hospitalId = req.user?.uid || 'hospital_web_user';
    return this.hospitalService.createRequisition(hospitalId, dto);
  }

  @Get('requisitions')
  @ApiOperation({ summary: 'Get list of requisitions (optionally filter by status)' })
  @ApiQuery({ name: 'status', required: false, enum: ['all', 'pending', 'matched', 'dispatched', 'fulfilled'] })
  async getRequisitions(@Req() req: any, @Query('status') status?: string) {
    const hospitalId = req.user?.role === 'admin' ? undefined : req.user?.uid;
    return this.hospitalService.getRequisitions(hospitalId, status);
  }

  @Patch('requisitions/:id/status')
  @ApiOperation({ summary: 'Update requisition status (pending, matched, dispatched, fulfilled)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; notes?: string },
  ) {
    return this.hospitalService.updateRequisitionStatus(id, body.status, body.notes);
  }

  @Get('compatible-donors')
  @ApiOperation({ summary: 'Find nearby compatible donors for immediate hospital contact' })
  @ApiQuery({ name: 'bloodGroup', required: true })
  @ApiQuery({ name: 'district', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getCompatibleDonors(
    @Query('bloodGroup') bloodGroup: string,
    @Query('district') district: string,
    @Query('limit') limit?: number,
  ) {
    return this.hospitalService.findCompatibleDonors(bloodGroup, district, limit || 25);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current hospital profile' })
  async getProfile(@Req() req: any) {
    const hospitalId = req.user?.uid || 'hospital_default';
    return this.hospitalService.getHospitalProfile(hospitalId);
  }

  @Get('staff')
  @ApiOperation({ summary: 'List internal position/staff accounts under this hospital' })
  async getStaff(@Req() req: any) {
    const facilityId = req.user?.facilityId || req.user?.uid || 'usr_hosp_001';
    return this.hospitalService.getStaff(facilityId);
  }

  @Post('staff')
  @ApiOperation({ summary: 'Add a new position account under this hospital' })
  async createStaff(@Req() req: any, @Body() dto: CreateStaffDto) {
    const facilityId = req.user?.facilityId || req.user?.uid || 'usr_hosp_001';
    const facilityName = req.user?.organization || 'Dhaka Medical College Hospital';
    return this.hospitalService.createStaff(facilityId, facilityName, dto);
  }

  @Patch('staff/:id/status')
  @ApiOperation({ summary: 'Toggle position account active/deactivate status' })
  async updateStaffStatus(
    @Param('id') id: string,
    @Body() body: { isActive?: boolean },
  ) {
    return this.hospitalService.updateStaffStatus(id, body.isActive);
  }

  @Delete('staff/:id')
  @ApiOperation({ summary: 'Delete a position account' })
  async deleteStaff(@Param('id') id: string) {
    return this.hospitalService.deleteStaff(id);
  }
}
