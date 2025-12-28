import { Controller, Post, Body } from '@nestjs/common';
import { BloodRequestService } from './blood-request.service';
import { BloodRequestDto } from './dto/blood-request.dto';

@Controller('blood-request')
export class BloodRequestController {

  constructor(private readonly service: BloodRequestService) {}

  @Post('notify')
  notifyDonors(@Body() dto: BloodRequestDto) {
    return this.service.notifyEligibleDonors(dto);
  }
}
