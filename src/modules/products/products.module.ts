import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { SiteAccessModule } from '../site-access/site-access.module.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';

@Module({
  imports: [AuditModule, SiteAccessModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
