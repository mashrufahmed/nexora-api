import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { VerificationModule } from '../verification/verification.module.js';
import { SiteAccessModule } from '../site-access/site-access.module.js';
import { RedisModule } from '../../redis/redis.module.js';
import { NewsletterController } from './newsletter.controller.js';
import { NewsletterService } from './newsletter.service.js';
@Module({
  imports: [AuditModule, VerificationModule, SiteAccessModule, RedisModule],
  controllers: [NewsletterController],
  providers: [NewsletterService],
})
export class NewsletterModule {}
