import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { BloodModule } from '../blood/blood.module';
import { DonorMatchingService } from './donor-matching.service';

@Module({
  imports: [
    FirebaseModule,
    BloodModule,
  ],
  providers: [DonorMatchingService],
  exports: [DonorMatchingService], // ✅ THIS MUST BE EXPORTED
})
export class MatchingModule {}