import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { RedisService } from '../../../redis/redis.service.js';

@Injectable()
export class LoginAttemptService {
  constructor(private readonly redisService: RedisService) {}

  private getEmailHash(email: string) {
    return createHash('sha256')
      .update(email.trim().toLowerCase())
      .digest('hex');
  }

  private getKeys(email: string) {
    const hash = this.getEmailHash(email);

    return {
      attempts: `nexora:admin:login:attempts:${hash}`,
      lock: `nexora:admin:login:lock:${hash}`,
    };
  }

  async isLocked(email: string): Promise<boolean> {
    const redis = this.redisService.getClient();
    const { lock } = this.getKeys(email);

    return (await redis.exists(lock)) === 1;
  }

  async recordFailedAttempt(email: string) {
    const redis = this.redisService.getClient();
    const { attempts, lock } = this.getKeys(email);

    const count = await redis.incr(attempts);

    if (count === 1) {
      await redis.expire(attempts, 900);
    }

    if (count >= 5) {
      await redis.set(lock, '1', 'EX', 900);
      await redis.del(attempts);

      throw new UnauthorizedException(
        'Too many failed attempts. Try again later.',
      );
    }
  }

  async resetAttempts(email: string) {
    const redis = this.redisService.getClient();
    const { attempts, lock } = this.getKeys(email);

    await redis.del(attempts, lock);
  }
}
