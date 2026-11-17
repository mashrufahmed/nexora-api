import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { PublishingController } from './publishing.controller.js';
import { PublishingService } from './publishing.service.js';

@Module({
  imports: [AuditModule],
  controllers: [PublishingController],
  providers: [PublishingService],
})
export class PublishingModule {}
