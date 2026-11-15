import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: Redis;

  constructor(private readonly config: ConfigService) {
    this.client = new Redis(this.config.getOrThrow<string>('REDIS_URL'), {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });
  }

  async onModuleInit() {
    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }
}
