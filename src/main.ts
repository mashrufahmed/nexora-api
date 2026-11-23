import fastifyCookie from '@fastify/cookie';
import csrfProtection from '@fastify/csrf-protection';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import fastifySession from '@fastify/session';
import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Logger as PinoLogger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { RedisService } from './redis/redis.service.js';
import { CompatibleRedisSessionStore } from './redis/redis-session.store.js';

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
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024, files: 1, parts: 20 },
    throwFileSizeLimit: true,
  });

  // Session
  await app.register(fastifySession, {
    store: new CompatibleRedisSessionStore({
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

  await app.register(csrfProtection, {
    sessionPlugin: '@fastify/session',
    getToken: (request) => {
      const token = request.headers['x-csrf-token'];
      return Array.isArray(token) ? token[0] : token;
    },
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
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-CSRF-Token',
    ],
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

  fastify.addHook('onRequest', (request, reply, done) => {
    const method = request.method.toUpperCase();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      done();
      return;
    }

    const publicAuthRoutes = [
      '/admin/auth/login',
      '/admin/auth/forgot-password',
      '/admin/auth/reset-password',
      '/admin/email/verify',
      '/admin/email/resend',
    ];
    if (publicAuthRoutes.some((route) => request.url.includes(route))) {
      done();
      return;
    }

    fastify.csrfProtection(request, reply, done);
  });

  // Global Prefix
  app.setGlobalPrefix(config.getOrThrow<string>('API_PREFIX'));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nexora API')
    .setDescription(
      'Multi-site CMS, product review, and affiliate publishing API',
    )
    .setVersion('1.0')
    .addCookieAuth(
      config.get<string>('SESSION_COOKIE_NAME', 'nexora_admin_sid'),
    )
    .addApiKey({ type: 'apiKey', name: 'X-Site-Key', in: 'header' }, 'site-key')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

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

void bootstrap();
