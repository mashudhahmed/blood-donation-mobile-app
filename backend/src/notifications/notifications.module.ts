import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from '../firebase/firebase.module';
import { MatchingModule } from '../matching/matching.module'; // NO SPACE
import { BloodModule } from '../blood/blood.module';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [
    ConfigModule,
    FirebaseModule,
    MatchingModule, // Fixed import
    BloodModule,
  ],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}