import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';
import { PermissionGuard } from '../rbac/guards/permission.guard.js';
import { ScheduleContentDto } from './dto/schedule-content.dto.js';
import { PublishingService } from './publishing.service.js';
import { UpdatePublicationDto } from './dto/update-publication.dto.js';
import {
  IdParamDto,
  PublicationParamDto,
} from '../../common/dto/resource-params.dto.js';

@Controller()
@UseGuards(AdminAuthGuard, PermissionGuard)
export class PublishingController {
  constructor(private readonly publishing: PublishingService) {}
  @Post('content/:id/schedule') @Permissions('content.publish') schedule(
    @Param() params: IdParamDto,
    @Body() dto: ScheduleContentDto,
    @Req() r: FastifyRequest,
  ) {
    return this.publishing.scheduleContent(
      params.id,
      dto.siteId,
      dto.scheduledAt,
      r.admin!.id,
    );
  }
  @Post('publishing/publish-due') @Permissions('content.publish') publishDue() {
    return this.publishing.publishDue();
  }
  @Patch('content/:id/publications/:publicationId')
  @Permissions('content.publish')
  update(
    @Param() params: PublicationParamDto,
    @Body() dto: UpdatePublicationDto,
    @Req() r: FastifyRequest,
  ) {
    return this.publishing.updatePublication(
      params.publicationId,
      dto,
      r.admin!.id,
    );
  }
  @Post('content/:id/publications/:publicationId/archive')
  @Permissions('content.publish')
  archive(@Param() params: PublicationParamDto, @Req() r: FastifyRequest) {
    return this.publishing.archivePublication(
      params.publicationId,
      r.admin!.id,
    );
  }
  @Post('content/:id/publications/:publicationId/republish')
  @Permissions('content.publish')
  republish(@Param() params: PublicationParamDto, @Req() r: FastifyRequest) {
    return this.publishing.republishPublication(
      params.publicationId,
      r.admin!.id,
    );
  }
  @Delete('content/:id/publications/:publicationId')
  @Permissions('content.publish')
  unpublish(@Param() params: PublicationParamDto, @Req() r: FastifyRequest) {
    return this.publishing.unpublishPublication(
      params.publicationId,
      r.admin!.id,
    );
  }
}
