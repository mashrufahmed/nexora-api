import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { VerificationModule } from '../verification/verification.module.js';
import { NewsletterController } from './newsletter.controller.js';
import { NewsletterService } from './newsletter.service.js';
@Module({
  imports: [AuditModule, VerificationModule],
  controllers: [NewsletterController],
  providers: [NewsletterService],
})
export class NewsletterModule {}
