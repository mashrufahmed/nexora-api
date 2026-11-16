import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { RedisService } from '../../../redis/redis.service.js';

@Injectable()
export class LoginAttemptService {
  constructor(
    private readonly redisService: RedisService,
    private readonly config: ConfigService,
  ) {}

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

  async recordFailedAttempt(email: string): Promise<void> {
    const redis = this.redisService.getClient();
    const { attempts, lock } = this.getKeys(email);

    const attemptTtl = this.config.getOrThrow<number>(
      'ADMIN_LOGIN_ATTEMPT_TTL',
    );

    const maxAttempts = this.config.getOrThrow<number>(
      'ADMIN_LOGIN_MAX_ATTEMPTS',
    );

    const lockTtl = this.config.getOrThrow<number>('ADMIN_LOGIN_LOCK_TTL');

    const script = `
    local count = redis.call('INCR', KEYS[1])

    if count == 1 then
      redis.call('EXPIRE', KEYS[1], ARGV[1])
    end

    if count >= tonumber(ARGV[2]) then
      redis.call('SET', KEYS[2], '1', 'EX', ARGV[3])
      redis.call('DEL', KEYS[1])
      return count
    end

    return count
  `;

    const count = await redis.eval(
      script,
      2,
      attempts,
      lock,
      String(attemptTtl),
      String(maxAttempts),
      String(lockTtl),
    );

    if (Number(count) >= maxAttempts) {
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
