import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { SiteAccessModule } from '../site-access/site-access.module.js';
import { AuthorsController } from './authors.controller.js';
import { AuthorsService } from './authors.service.js';

@Module({
  imports: [AuditModule, SiteAccessModule],
  controllers: [AuthorsController],
  providers: [AuthorsService],
})
export class AuthorsModule {}
