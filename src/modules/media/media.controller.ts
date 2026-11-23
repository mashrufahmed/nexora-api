import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';
import { PermissionGuard } from '../rbac/guards/permission.guard.js';
import { UpdateMediaDto } from './dto/update-media.dto.js';
import { UploadMediaDto } from './dto/upload-media.dto.js';
import { MediaListQueryDto } from './dto/media-list-query.dto.js';
import { MediaService } from './media.service.js';
import { MAX_MEDIA_BYTES } from './media.constants.js';
import { IdParamDto } from '../../common/dto/resource-params.dto.js';

@Controller('media')
@UseGuards(AdminAuthGuard, PermissionGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}
  @Post() @Permissions('media.upload') upload(
    @Body() dto: UploadMediaDto,
    @Req() req: FastifyRequest,
  ) {
    return this.media.upload(dto, req.admin!.id);
  }
  @Post('multipart') @Permissions('media.upload') async multipart(
    @Req() req: FastifyRequest,
  ) {
    const file = await req.file();
    if (!file) throw new BadRequestException('File is required');
    let buffer: Buffer;
    try {
      buffer = await file.toBuffer();
    } catch (error) {
      if (error instanceof Error && /file size limit/i.test(error.message))
        throw new BadRequestException(
          `Media must be between 1 byte and ${MAX_MEDIA_BYTES / 1024 / 1024} MB`,
        );
      throw error;
    }
    const fields = file.fields as Record<string, { value?: string }>;
    return this.media.upload(
      {
        originalFilename: file.filename,
        mimeType: file.mimetype,
        data: buffer.toString('base64'),
        siteId: fields.siteId?.value,
        alt: fields.alt?.value,
        caption: fields.caption?.value,
      },
      req.admin!.id,
    );
  }
  @Get() @Permissions('media.upload') list(
    @Query() query: MediaListQueryDto,
    @Req() req: FastifyRequest,
  ) {
    return this.media.list(req.admin!.id, query.siteId, query.search);
  }
  @Patch(':id') @Permissions('media.upload') update(
    @Param() params: IdParamDto,
    @Body() dto: UpdateMediaDto,
    @Req() req: FastifyRequest,
  ) {
    return this.media.update(params.id, dto, req.admin!.id);
  }
  @Delete(':id') @Permissions('media.delete') remove(
    @Param() params: IdParamDto,
    @Req() req: FastifyRequest,
  ) {
    return this.media.remove(params.id, req.admin!.id);
  }
}
