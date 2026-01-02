import { Module } from '@nestjs/common';
import { BloodRequestController } from './blood-request.controller';
import { BloodRequestService } from './blood-request.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { DonorService } from '../donor/donor.service';

@Module({
  imports: [
    FirebaseModule, // ✅ provides FirebaseService
  ],
  controllers: [BloodRequestController],
  providers: [
    BloodRequestService,
    DonorService,   // ✅ FIXES the error
  ],
})
export class BloodRequestModule {}
