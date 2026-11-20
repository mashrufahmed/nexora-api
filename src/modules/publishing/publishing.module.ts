import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { SiteAccessModule } from '../site-access/site-access.module.js';
import { PublishingController } from './publishing.controller.js';
import { PublishingService } from './publishing.service.js';
import { QueueModule } from '../../queue/queue.module.js';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('scheduled-publishing')
class ScheduledPublishingProcessor extends WorkerHost {
  constructor(private readonly publishing: PublishingService) { super(); }
  async process(job: Job<{ limit?: number }>) { return this.publishing.publishDue(job.data.limit ?? 100); }
}

@Module({
  imports: [AuditModule, QueueModule, SiteAccessModule],
  controllers: [PublishingController],
  providers: [PublishingService, ScheduledPublishingProcessor],
})
export class PublishingModule {}
