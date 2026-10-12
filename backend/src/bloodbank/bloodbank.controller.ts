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
import { BloodBankService } from './bloodbank.service';
import { InventoryAdjustmentDto, CreateDriveDto } from './dto/bloodbank.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles, UserRole } from '../auth/roles.decorator';

@ApiTags('Blood Banks')
@Controller('bloodbanks')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles(UserRole.BLOOD_BANK, UserRole.ADMIN)
@ApiBearerAuth()
export class BloodBankController {
  constructor(private readonly bloodBankService: BloodBankService) {}

  @Get('inventory')
  @ApiOperation({ summary: 'Get current 8-group blood stock levels and alert status' })
  @ApiQuery({ name: 'bankId', required: false })
  async getInventory(@Req() req: any, @Query('bankId') bankId?: string) {
    const targetBankId = bankId || req.user?.uid || 'main_blood_bank';
    return this.bloodBankService.getInventory(targetBankId);
  }

  @Post('inventory/adjust')
  @ApiOperation({ summary: 'Record blood intake, dispatch, or expiration transaction' })
  async adjustInventory(@Req() req: any, @Body() dto: InventoryAdjustmentDto) {
    const bankId = req.user?.uid || 'main_blood_bank';
    return this.bloodBankService.adjustInventory(bankId, dto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get historical audit logs of all blood stock movements' })
  @ApiQuery({ name: 'bankId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTransactions(
    @Req() req: any,
    @Query('bankId') bankId?: string,
    @Query('limit') limit?: number,
  ) {
    const targetBankId = bankId || req.user?.uid || 'main_blood_bank';
    return this.bloodBankService.getTransactions(targetBankId, limit ? Number(limit) : 25);
  }

  @Post('drives')
  @ApiOperation({ summary: 'Schedule a public blood donation drive campaign' })
  async createDrive(@Req() req: any, @Body() dto: CreateDriveDto) {
    const bankId = req.user?.uid || 'main_blood_bank';
    return this.bloodBankService.createDrive(bankId, dto);
  }

  @Get('drives')
  @ApiOperation({ summary: 'List planned or ongoing blood drives' })
  @ApiQuery({ name: 'bankId', required: false })
  async getDrives(@Req() req: any, @Query('bankId') bankId?: string) {
    const targetBankId = bankId || (req.user?.role === 'admin' ? undefined : req.user?.uid);
    return this.bloodBankService.getDrives(targetBankId);
  }

  @Post('donations/record')
  @ApiOperation({ summary: 'Record on-site walk-in donor collection and update donor eligibility' })
  async recordWalkInDonation(
    @Req() req: any,
    @Body() body: { donorId: string; bloodGroup: string; units?: number },
  ) {
    const bankId = req.user?.uid || 'main_blood_bank';
    return this.bloodBankService.recordWalkInDonation(
      bankId,
      body.donorId,
      body.bloodGroup,
      body.units || 1,
    );
  }

  @Get('staff')
  @ApiOperation({ summary: 'List internal position/staff accounts under this blood bank' })
  async getStaff(@Req() req: any) {
    const facilityId = req.user?.facilityId || req.user?.uid || 'usr_bb_001';
    return this.bloodBankService.getStaff(facilityId);
  }

  @Post('staff')
  @ApiOperation({ summary: 'Add a new position account under this blood bank' })
  async createStaff(@Req() req: any, @Body() dto: CreateStaffDto) {
    const facilityId = req.user?.facilityId || req.user?.uid || 'usr_bb_001';
    const facilityName = req.user?.organization || 'Red Crescent Blood Center';
    return this.bloodBankService.createStaff(facilityId, facilityName, dto);
  }

  @Patch('staff/:id/status')
  @ApiOperation({ summary: 'Toggle position account active/deactivate status' })
  async updateStaffStatus(
    @Param('id') id: string,
    @Body() body: { isActive?: boolean },
  ) {
    return this.bloodBankService.updateStaffStatus(id, body.isActive);
  }

  @Delete('staff/:id')
  @ApiOperation({ summary: 'Delete a position account' })
  async deleteStaff(@Param('id') id: string) {
    return this.bloodBankService.deleteStaff(id);
  }
}
