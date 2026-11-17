import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { AuthorsController } from './authors.controller.js';
import { AuthorsService } from './authors.service.js';

@Module({ imports: [AuditModule], controllers: [AuthorsController], providers: [AuthorsService] })
export class AuthorsModule {}