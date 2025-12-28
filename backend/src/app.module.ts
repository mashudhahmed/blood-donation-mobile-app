import { Module } from '@nestjs/common';
import { BloodRequestModule } from './blood-request/blood-request.module';

@Module({
  imports: [BloodRequestModule],
})
export class AppModule {}
