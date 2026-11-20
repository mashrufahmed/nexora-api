import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { SiteAccessModule } from '../site-access/site-access.module.js';
import { PageBuilderController } from './page-builder.controller.js';
import { PageBuilderService } from './page-builder.service.js';

@Module({
  imports: [AuditModule, SiteAccessModule],
  controllers: [PageBuilderController],
  providers: [PageBuilderService],
})
export class PageBuilderModule {}
