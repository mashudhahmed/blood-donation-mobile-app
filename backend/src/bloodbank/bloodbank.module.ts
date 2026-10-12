import { Module } from '@nestjs/common';
import { BloodBankController } from './bloodbank.controller';
import { BloodBankService } from './bloodbank.service';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
  controllers: [BloodBankController],
  providers: [BloodBankService],
  exports: [BloodBankService],
})
export class BloodBankModule {}
