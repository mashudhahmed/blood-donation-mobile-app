import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for Android app
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: false,
  });

  // Set global prefix
  app.setGlobalPrefix('api');

  // ✅ IMPORTANT: Use Render's port and bind to 0.0.0.0
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Notification server running on port ${port}`);
  console.log(`📱 Send notifications to: /api/notifications/send`);
}

bootstrap();
