import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { AffiliateController } from './affiliate.controller.js';
import { AffiliateService } from './affiliate.service.js';
import { QueueModule } from '../../queue/queue.module.js';
@Module({
  imports: [AuditModule, QueueModule],
  controllers: [AffiliateController],
  providers: [AffiliateService],
})
export class AffiliateModule {}
