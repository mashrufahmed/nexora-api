import { BullModule, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Module } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service.js';

@Processor('affiliate-clicks')
@Injectable()
export class AffiliateClickProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) { super(); }
  async process(job: Job<{ affiliateLinkId: string; siteId: string; referrer?: string; userAgentHash?: string }>) { return this.prisma.affiliateClick.create({ data: job.data }); }
}
@Module({ imports: [BullModule.registerQueue({ name: 'affiliate-clicks' }, { name: 'scheduled-publishing' })], providers: [AffiliateClickProcessor], exports: [BullModule] })
export class QueueModule {}