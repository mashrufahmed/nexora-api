import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { SiteAccessModule } from '../site-access/site-access.module.js';
import { SitesController } from './sites.controller.js';
import { SitesService } from './sites.service.js';

@Module({
  imports: [AuditModule, SiteAccessModule],
  controllers: [SitesController],
  providers: [SitesService],
  exports: [SitesService],
})
export class SitesModule {}
