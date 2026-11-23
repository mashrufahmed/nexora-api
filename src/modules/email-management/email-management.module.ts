import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { SiteAccessModule } from '../site-access/site-access.module.js';
import { EmailManagementController } from './email-management.controller.js';
import { EmailManagementService } from './email-management.service.js';
import { QueueModule } from '../../queue/queue.module.js';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { OnWorkerEvent } from '@nestjs/bullmq';
import { QueueAlertService } from '../../queue/queue-alert.service.js';

@Processor('email-sending')
class EmailSendingProcessor extends WorkerHost {
  constructor(private readonly email: EmailManagementService, private readonly alerts: QueueAlertService) { super(); }
  async process(job: Job<{ emailMessageId: string }>) { return this.email.deliver(job.data.emailMessageId); }
  @OnWorkerEvent('failed') failed(job: Job | undefined, error: Error) { this.alerts.failed('email-sending', job, error); }
}
@Module({
  imports: [AuditModule, SiteAccessModule, QueueModule],
  controllers: [EmailManagementController],
  providers: [EmailManagementService, EmailSendingProcessor],
})
export class EmailManagementModule {}
