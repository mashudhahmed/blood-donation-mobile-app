import { Module, Global } from '@nestjs/common';
import { FirebaseService } from './firebase.service';

@Global() // Makes FirebaseService available globally without importing in every module
@Module({
  providers: [FirebaseService],
  exports: [FirebaseService]
})
export class FirebaseModule {}