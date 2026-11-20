import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { SiteAccessModule } from '../site-access/site-access.module.js';
import { EmailManagementController } from './email-management.controller.js';
import { EmailManagementService } from './email-management.service.js';
import { QueueModule } from '../../queue/queue.module.js';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('email-sending')
class EmailSendingProcessor extends WorkerHost {
  constructor(private readonly email: EmailManagementService) { super(); }
  async process(job: Job<{ emailMessageId: string }>) { return this.email.deliver(job.data.emailMessageId); }
}
@Module({
  imports: [AuditModule, SiteAccessModule, QueueModule],
  controllers: [EmailManagementController],
  providers: [EmailManagementService, EmailSendingProcessor],
})
export class EmailManagementModule {}
