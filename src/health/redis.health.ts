import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly redis: RedisService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string) {
    const indicator = this.healthIndicatorService.check(key);

    try {
      const response = await this.redis.ping();

      if (response !== 'PONG') {
        return indicator.down({
          message: 'Redis ping failed',
        });
      }

      return indicator.up();
    } catch {
      return indicator.down({
        message: 'Redis connection failed',
      });
    }
  }
}
