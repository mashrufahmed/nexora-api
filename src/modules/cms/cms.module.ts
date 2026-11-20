import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { SiteAccessModule } from '../site-access/site-access.module.js';
import { CmsController } from './cms.controller.js';
import { CmsService } from './cms.service.js';

@Module({
  imports: [AuditModule, SiteAccessModule],
  controllers: [CmsController],
  providers: [CmsService],
})
export class CmsModule {}
