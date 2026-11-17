import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { TagsRedirectsController } from './tags-redirects.controller.js';
import { TagsRedirectsService } from './tags-redirects.service.js';
@Module({
  imports: [AuditModule],
  controllers: [TagsRedirectsController],
  providers: [TagsRedirectsService],
})
export class TagsRedirectsModule {}
