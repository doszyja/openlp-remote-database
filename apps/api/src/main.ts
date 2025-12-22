import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as express from 'express';
import { WebSocketServerService } from './service-plan/websocket-server.service';

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
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow CORS
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

  // CORS configuration - supports multiple origins separated by commas
  const corsOriginsFromEnv = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];
  
  // Extract origin from FRONTEND_URL if set
  const frontendUrl = process.env.FRONTEND_URL;
  const frontendOrigin = frontendUrl ? new URL(frontendUrl).origin : null;
  
  // Extract origin from DISCORD_CALLBACK_URL if set (for OAuth redirects)
  const discordCallbackUrl = process.env.DISCORD_CALLBACK_URL;
  const discordCallbackOrigin = discordCallbackUrl ? new URL(discordCallbackUrl).origin : null;
  
  // Default origins for development
  const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5174',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];
  
  // Additional origins from CORS_ORIGINS (plural) if set
  const additionalOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];
  
  // Combine all allowed origins (remove duplicates)
  const allAllowedOrigins = [
    ...new Set([
      ...corsOriginsFromEnv,
      ...defaultOrigins,
      ...additionalOrigins,
      ...(frontendOrigin ? [frontendOrigin] : []),
      ...(discordCallbackOrigin ? [discordCallbackOrigin] : []),
    ])
  ];
  
  console.log(`[CORS] Allowed origins: ${allAllowedOrigins.join(', ')}`);
  if (frontendOrigin) {
    console.log(`[CORS] Frontend URL origin: ${frontendOrigin}`);
  }
  if (discordCallbackOrigin) {
    console.log(`[CORS] Discord callback origin: ${discordCallbackOrigin}`);
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl requests, or server-to-server)
      if (!origin) {
        console.log('[CORS] Allowing request with no origin');
        return callback(null, true);
      }
      
      // Log all CORS requests for debugging
      console.log(`[CORS] Request from origin: ${origin}`);
      
      // Check if origin is in allowed list
      if (allAllowedOrigins.includes(origin)) {
        console.log(`[CORS] Origin ${origin} is in allowed list`);
        return callback(null, true);
      }
      
      // For development, allow all localhost origins and common dev ports
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
        if (
          origin.startsWith('http://localhost:') || 
          origin.startsWith('https://localhost:') ||
          origin.startsWith('http://127.0.0.1:') ||
          origin.startsWith('https://127.0.0.1:') ||
          origin.startsWith('http://0.0.0.0:') ||
          origin.startsWith('https://0.0.0.0:')
        ) {
          console.log(`[CORS] Allowing localhost origin in development: ${origin}`);
          return callback(null, true);
        }
      }
      
      // Log CORS rejection for debugging
      console.warn(`[CORS] ❌ Blocked origin: ${origin}`);
      console.warn(`[CORS] Allowed origins: ${allAllowedOrigins.join(', ')}`);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    // Allow all common HTTP methods
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    // Allow common headers including Authorization and custom headers
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Headers',
      'Access-Control-Allow-Methods',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
    ],
    // Expose headers that frontend might need
    exposedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Total-Count',
      'X-Page',
      'X-Limit',
    ],
    // Allow preflight requests to be cached
    maxAge: 86400, // 24 hours
    // Enable preflight continuation for complex requests
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // API prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  const httpServer = await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}/api`);

  // Initialize WebSocket server using the same HTTP server (upgrade requests)
  const wsServer = app.get(WebSocketServerService);
  wsServer.initialize(httpServer, '/ws/service-plans');
}
bootstrap();
