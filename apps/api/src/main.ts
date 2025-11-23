import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Security: Disable default body parser to configure limits manually
    bodyParser: false,
  });

  // Security: Helmet - HTTP security headers
  // Protects against XSS, clickjacking, MIME sniffing, etc.
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
    crossOriginEmbedderPolicy: false, // Allow embedding if needed
  }));

  // Security: Configure body parser limits via Express instance
  // Express default is 100kb, we set 10MB for song content but still limit it
  // This prevents large payload attacks that could exhaust memory
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(express.json({ limit: '10mb' }));
  expressApp.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // Security: Transform and validate to prevent injection attacks
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // CORS configuration
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // For development, allow localhost origins
      if (process.env.NODE_ENV === 'development') {
        if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
          return callback(null, true);
        }
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    // Security: Restrict allowed methods and headers
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // API prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
}
bootstrap();
