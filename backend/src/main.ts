import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false, // We register our own body parsers below with a higher limit
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false, // Allow <object>/<embed> for PDF preview
      // SECURITY: Configure CSP instead of disabling it entirely
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.paddle.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'", frontendUrl, 'https://cdn.paddle.com', 'https://sandbox-api.paddle.com', 'https://api.paddle.com'],
          frameSrc: ["'self'", 'https://cdn.paddle.com', 'https://sandbox-buy.paddle.com', 'https://buy.paddle.com'],
          objectSrc: ["'self'", 'blob:'], // For PDF preview with <object>/<embed>
          workerSrc: ["'self'", 'blob:'],
        },
      },
    }),
  );
  app.disable('x-powered-by');

  app.setGlobalPrefix('api');

  // Register body parsers with 20MB limit (default is 100KB).
  // Stamps and signatures are sent as base64-encoded PNGs after canvas processing
  // (removeWhiteBackground), which can inflate a 200KB JPEG to 5-10MB+ as PNG base64.
  // The verify callback captures the raw body buffer for Paddle webhook signature verification.
  app.use(
    express.json({
      limit: '20mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ limit: '20mb', extended: true }));

  app.use(cookieParser());

  // SECURITY: Validate CORS origin is explicitly set — undefined would disable origin checks
  if (!process.env.FRONTEND_URL && process.env.NODE_ENV === 'production') {
    console.error('FATAL: FRONTEND_URL must be set in production for CORS security');
    process.exit(1);
  }
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TimeoutInterceptor(15000), new ResponseInterceptor());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
bootstrap()
  .then(() => console.log('Started on port 3000'))
  .catch((err) => console.log(err));
