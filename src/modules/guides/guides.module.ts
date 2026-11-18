import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { GuidesController } from './guides.controller.js';
import { GuidesService } from './guides.service.js';
@Module({
  imports: [AuditModule],
  controllers: [GuidesController],
  providers: [GuidesService],
})
export class GuidesModule {}
