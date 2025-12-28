import { Module } from '@nestjs/common';
import { BloodRequestController } from './blood-request.controller';
import { BloodRequestService } from './blood-request.service';

@Module({
  controllers: [BloodRequestController],
  providers: [BloodRequestService],
})
export class BloodRequestModule {}
