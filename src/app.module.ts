import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, seconds } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { validateEnvironment } from './config/env.validation.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { MailModule } from './mail/mail.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { RbacModule } from './modules/rbac/rbac.module.js';
import { RedisModule } from './redis/redis.module.js';
import { RedisService } from './redis/redis.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: validateEnvironment,
      expandVariables: true,
    }),

    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'HH:MM:ss',
                  ignore: 'pid,hostname,req,res,responseTime',
                },
              }
            : undefined,
        genReqId: (request) => request.id,
        autoLogging: false,
        redact: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-api-key"]',
        ],
      },
    }),

    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisService],
      useFactory: (redis: RedisService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: seconds(60),
            limit: 100,
            blockDuration: seconds(60),
          },
        ],

        storage: new ThrottlerStorageRedisService(redis.getClient()),
      }),
    }),
    HealthModule,
    DatabaseModule,
    RedisModule,
    MailModule,
    RbacModule,
    AdminModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
