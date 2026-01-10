import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for all devices (Android, iOS, Web)
  app.enableCors({
    origin: '*', // Allow any device
    methods: 'GET,POST',
    allowedHeaders: 'Content-Type',
  });
  
  // Set global prefix
  app.setGlobalPrefix('api');
  
  // For Render: use provided PORT and bind to 0.0.0.0
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Blood Donation API running on port ${port}`);
}
bootstrap();