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

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false, // Allow <object>/<embed> for PDF preview
      contentSecurityPolicy: false, // Avoid blocking inline PDF rendering
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

  app.enableCors({
    origin: process.env.FRONTEND_URL,
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
