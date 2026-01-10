import { Module } from '@nestjs/common';
import { DonorMatchingService } from './donor-matching.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { BloodCompatibilityService } from '../blood/blood-compatibility.service';

@Module({
  imports: [FirebaseModule],
  providers: [DonorMatchingService, BloodCompatibilityService],
  exports: [DonorMatchingService, BloodCompatibilityService]
})
export class MatchingModule {}