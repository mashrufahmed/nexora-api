import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { SiteAccessModule } from '../site-access/site-access.module.js';
import { GuidesController } from './guides.controller.js';
import { GuidesService } from './guides.service.js';
@Module({
  imports: [AuditModule, SiteAccessModule],
  controllers: [GuidesController],
  providers: [GuidesService],
})
export class GuidesModule {}
