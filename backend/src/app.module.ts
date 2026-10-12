import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from './firebase/firebase.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MatchingModule } from './matching/matching.module';
import { BloodModule } from './blood/blood.module';
import { AdminModule } from './admin/admin.module';
import { HospitalModule } from './hospital/hospital.module';
import { BloodBankModule } from './bloodbank/bloodbank.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    FirebaseModule,
    AuthModule,
    ChatModule,
    BloodModule,
    MatchingModule,
    NotificationsModule,
    AdminModule,
    HospitalModule,
    BloodBankModule,
  ],
})
export class AppModule {}