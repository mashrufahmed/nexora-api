import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { EmailManagementController } from './email-management.controller.js';
import { EmailManagementService } from './email-management.service.js';
@Module({
  imports: [AuditModule],
  controllers: [EmailManagementController],
  providers: [EmailManagementService],
})
export class EmailManagementModule {}
