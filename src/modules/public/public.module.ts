import { Module } from '@nestjs/common';
import { SitesModule } from '../sites/sites.module.js';
import { PublicController } from './public.controller.js';
import { PublicService } from './public.service.js';
@Module({ imports: [SitesModule], controllers: [PublicController], providers: [PublicService] })
export class PublicModule {}