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
import { SiteIdQueryDto } from '../site-access/dto/site-id-query.dto.js';
import {
  IdParamDto,
  StatusParamDto,
} from '../../common/dto/resource-params.dto.js';
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
    @Query() query: SiteIdQueryDto,
    @Req() r: FastifyRequest,
  ) {
    return this.guides.list(query.siteId, r.admin!.id);
  }
  @Get('buying-guides/:id') @Permissions('guide.manage') getGuide(
    @Param() params: IdParamDto,
    @Req() r: FastifyRequest,
  ) {
    return this.guides.get(params.id, r.admin!.id);
  }
  @Patch('buying-guides/:id') @Permissions('guide.manage') updateGuide(
    @Param() params: IdParamDto,
    @Body() d: GuideDto,
    @Req() r: FastifyRequest,
  ) {
    return this.guides.update(params.id, d, r.admin!.id);
  }
  @Delete('buying-guides/:id') @Permissions('guide.manage') deleteGuide(
    @Param() params: IdParamDto,
    @Req() r: FastifyRequest,
  ) {
    return this.guides.remove(params.id, r.admin!.id);
  }
  @Post('buying-guides/:id/:status')
  @Permissions('guide.manage')
  transitionGuide(@Param() params: StatusParamDto, @Req() r: FastifyRequest) {
    return this.guides.transition(params.id, params.status, r.admin!.id);
  }
  @Post('buying-guides/:id/items') @Permissions('guide.manage') addGuide(
    @Param() params: IdParamDto,
    @Body() d: GuideItemsDto,
    @Req() r: FastifyRequest,
  ) {
    return this.guides.addItems(params.id, d, r.admin!.id);
  }
  @Post('comparisons') @Permissions('comparison.manage') createComparison(
    @Body() d: GuideDto,
    @Req() r: FastifyRequest,
  ) {
    return this.guides.create(d, r.admin!.id, true);
  }
  @Get('comparisons') @Permissions('comparison.manage') listComparison(
    @Query() query: SiteIdQueryDto,
    @Req() r: FastifyRequest,
  ) {
    return this.guides.list(query.siteId, r.admin!.id, true);
  }
  @Get('comparisons/:id') @Permissions('comparison.manage') getComparison(
    @Param() params: IdParamDto,
    @Req() r: FastifyRequest,
  ) {
    return this.guides.get(params.id, r.admin!.id, true);
  }
  @Patch('comparisons/:id') @Permissions('comparison.manage') updateComparison(
    @Param() params: IdParamDto,
    @Body() d: GuideDto,
    @Req() r: FastifyRequest,
  ) {
    return this.guides.update(params.id, d, r.admin!.id, true);
  }
  @Delete('comparisons/:id') @Permissions('comparison.manage') deleteComparison(
    @Param() params: IdParamDto,
    @Req() r: FastifyRequest,
  ) {
    return this.guides.remove(params.id, r.admin!.id, true);
  }
  @Post('comparisons/:id/:status')
  @Permissions('comparison.manage')
  transitionComparison(
    @Param() params: StatusParamDto,
    @Req() r: FastifyRequest,
  ) {
    return this.guides.transition(params.id, params.status, r.admin!.id, true);
  }
  @Post('comparisons/:id/items')
  @Permissions('comparison.manage')
  addComparison(
    @Param() params: IdParamDto,
    @Body() d: GuideItemsDto,
    @Req() r: FastifyRequest,
  ) {
    return this.guides.addItems(params.id, d, r.admin!.id, true);
  }
}
