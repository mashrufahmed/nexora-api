import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { CmsController } from './cms.controller.js';
import { CmsService } from './cms.service.js';

@Module({
  imports: [AuditModule],
  controllers: [CmsController],
  providers: [CmsService],
})
export class CmsModule {}