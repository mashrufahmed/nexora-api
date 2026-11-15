import fastifyCookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import fastifySession from '@fastify/session';
import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import RedisStore from 'fastify-session-redis-store';
import { Logger as PinoLogger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { RedisService } from './redis/redis.service.js';

async function bootstrap() {
  const adapter = new FastifyAdapter({
    genReqId: () => crypto.randomUUID(),
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    {
      bufferLogs: true,
    },
  );

  const fastify = app.getHttpAdapter().getInstance();
  const config = app.get(ConfigService);
  const redis = app.get(RedisService);

  // Structured Logger
  app.useLogger(app.get(PinoLogger));

  // Security Headers + CSP
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'https:', 'data:'],
        connectSrc: ["'self'"],
      },
    },
  });

  // Cookie
  await app.register(fastifyCookie);

  // Session
  await app.register(fastifySession, {
    store: new RedisStore({
      client: redis.getClient(),
      prefix: 'nexora:admin:session:',
    }),

    secret: config.getOrThrow<string>('SESSION_SECRET'),

    cookieName: config.get<string>('SESSION_COOKIE_NAME', 'nexora_admin_sid'),

    cookie: {
      path: '/',
      httpOnly: true,
      secure: config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: config.get<number>('SESSION_TTL', 900) * 1000,
    },

    saveUninitialized: false,
    rolling: true,
  });

  // CORS
  const corsOrigins = config
    .getOrThrow<string>('CORS_ORIGINS')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const trustedOrigins = new Set(corsOrigins);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // Global Origin + Fetch Metadata CSRF Protection
  fastify.addHook('onRequest', async (request, _reply) => {
    const method = request.method.toUpperCase();

    // Safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return;
    }

    // Origin validation
    const origin = request.headers.origin;

    if (!origin || !trustedOrigins.has(origin)) {
      throw new ForbiddenException('Invalid request origin');
    }

    // Fetch Metadata validation
    const fetchSite = request.headers['sec-fetch-site'];

    if (fetchSite && !['same-origin', 'same-site'].includes(fetchSite)) {
      throw new ForbiddenException('Cross-site request is forbidden');
    }
  });

  // Global Prefix
  app.setGlobalPrefix(config.getOrThrow<string>('API_PREFIX'));

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Error Handling
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Response
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Graceful Shutdown
  app.enableShutdownHooks();

  await app.listen(config.getOrThrow<number>('PORT'), '0.0.0.0');
}

bootstrap();
