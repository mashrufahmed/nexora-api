import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { AffiliateController } from './affiliate.controller.js';
import { AffiliateService } from './affiliate.service.js';
@Module({ imports: [AuditModule], controllers: [AffiliateController], providers: [AffiliateService] }) export class AffiliateModule {}