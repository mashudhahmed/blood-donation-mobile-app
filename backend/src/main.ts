import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for Android app
  app.enableCors({
    origin: '*', // Allow all origins (or specify your Android app)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: false,
  });
  
  // Set global prefix
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Notification server running on: http://localhost:${port}`);
  console.log(`📱 Send notifications to: POST http://localhost:${port}/api/notifications/send`);
}

bootstrap();