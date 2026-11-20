import { Module } from '@nestjs/common';
import { SiteAccessService } from './site-access.service.js';

@Module({ providers: [SiteAccessService], exports: [SiteAccessService] })
export class SiteAccessModule {}