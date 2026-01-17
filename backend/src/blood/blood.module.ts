import { Module } from '@nestjs/common';
import { BloodCompatibilityService } from './blood-compatibility.service';

@Module({
  providers: [BloodCompatibilityService],
  exports: [BloodCompatibilityService] // ✅ Already has exports - GOOD!
})
export class BloodModule {}