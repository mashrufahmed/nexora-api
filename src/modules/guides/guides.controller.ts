import {
  Body,
  Controller,
  Get,
  Delete,
  Patch,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';
import { PermissionGuard } from '../rbac/guards/permission.guard.js';
import { GuideDto, GuideItemsDto } from './dto/guide.dto.js';
import { GuidesService } from './guides.service.js';
@Controller()
@UseGuards(AdminAuthGuard, PermissionGuard)
export class GuidesController {
  constructor(private readonly guides: GuidesService) {}
  @Post('buying-guides') @Permissions('guide.manage') createGuide(
    @Body() d: GuideDto,
    @Req() r: FastifyRequest,
  ) {
    return this.guides.create(d, r.admin!.id);
  }
  @Get('buying-guides') @Permissions('guide.manage') listGuide(
    @Query('siteId') s: string,
    @Req() r: FastifyRequest,
  ) {
    return this.guides.list(s, r.admin!.id);
  }
  @Get('buying-guides/:id') @Permissions('guide.manage') getGuide(@Param('id') id: string, @Req() r: FastifyRequest) { return this.guides.get(id, r.admin!.id); }
  @Patch('buying-guides/:id') @Permissions('guide.manage') updateGuide(@Param('id') id: string, @Body() d: GuideDto, @Req() r: FastifyRequest) { return this.guides.update(id, d, r.admin!.id); }
  @Delete('buying-guides/:id') @Permissions('guide.manage') deleteGuide(@Param('id') id: string, @Req() r: FastifyRequest) { return this.guides.remove(id, r.admin!.id); }
  @Post('buying-guides/:id/:status') @Permissions('guide.manage') transitionGuide(@Param('id') id: string, @Param('status') status: 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED', @Req() r: FastifyRequest) { return this.guides.transition(id, status, r.admin!.id); }
  @Post('buying-guides/:id/items') @Permissions('guide.manage') addGuide(
    @Param('id') id: string,
    @Body() d: GuideItemsDto,
    @Req() r: FastifyRequest,
  ) {
    return this.guides.addItems(id, d, r.admin!.id);
  }
  @Post('comparisons') @Permissions('comparison.manage') createComparison(
    @Body() d: GuideDto,
    @Req() r: FastifyRequest,
  ) {
    return this.guides.create(d, r.admin!.id, true);
  }
  @Get('comparisons') @Permissions('comparison.manage') listComparison(
    @Query('siteId') s: string,
    @Req() r: FastifyRequest,
  ) {
    return this.guides.list(s, r.admin!.id, true);
  }
  @Get('comparisons/:id') @Permissions('comparison.manage') getComparison(@Param('id') id: string, @Req() r: FastifyRequest) { return this.guides.get(id, r.admin!.id, true); }
  @Patch('comparisons/:id') @Permissions('comparison.manage') updateComparison(@Param('id') id: string, @Body() d: GuideDto, @Req() r: FastifyRequest) { return this.guides.update(id, d, r.admin!.id, true); }
  @Delete('comparisons/:id') @Permissions('comparison.manage') deleteComparison(@Param('id') id: string, @Req() r: FastifyRequest) { return this.guides.remove(id, r.admin!.id, true); }
  @Post('comparisons/:id/:status') @Permissions('comparison.manage') transitionComparison(@Param('id') id: string, @Param('status') status: 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED', @Req() r: FastifyRequest) { return this.guides.transition(id, status, r.admin!.id, true); }
  @Post('comparisons/:id/items')
  @Permissions('comparison.manage')
  addComparison(
    @Param('id') id: string,
    @Body() d: GuideItemsDto,
    @Req() r: FastifyRequest,
  ) {
    return this.guides.addItems(id, d, r.admin!.id, true);
  }
}
