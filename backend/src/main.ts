// main.ts - enhanced version
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  // Set global prefix
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  
  logger.log(`🚀 Blood Donation API running on port ${port}`);
  logger.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`🔗 Health check: http://localhost:${port}/api/notifications/health`);
  
  // Log Firebase status
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    logger.log('✅ Firebase credentials detected');
  }
}
bootstrap();