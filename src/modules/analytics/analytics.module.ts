import { Module } from '@nestjs/common';
import { PublicModule } from '../public/public.module.js';
import { SiteAccessModule } from '../site-access/site-access.module.js';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';
import { SitesModule } from '../sites/sites.module.js';
@Module({
  imports: [SiteAccessModule, PublicModule, SitesModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
