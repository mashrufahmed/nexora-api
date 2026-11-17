import {
  Body,
  Controller,
  Delete,
  Get,
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
import { CreateCriterionDto } from './dto/create-criterion.dto.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { ReviewsService } from './reviews.service.js';

@Controller()
@UseGuards(AdminAuthGuard, PermissionGuard)
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post('sites/:siteId/review-criteria')
  @Permissions('review.create')
  createCriterion(
    @Param('siteId') siteId: string,
    @Body() dto: CreateCriterionDto,
    @Req() request: FastifyRequest,
  ) {
    return this.reviews.createCriterion(siteId, dto, request.admin!.id);
  }

  @Get('sites/:siteId/review-criteria')
  @Permissions('review.create')
  listCriteria(
    @Param('siteId') siteId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.reviews.listCriteria(siteId, request.admin!.id);
  }

  @Patch('review-criteria/:id')
  @Permissions('review.update')
  updateCriterion(
    @Param('id') id: string,
    @Body() dto: CreateCriterionDto,
    @Req() request: FastifyRequest,
  ) {
    return this.reviews.updateCriterion(id, dto, request.admin!.id);
  }

  @Delete('review-criteria/:id')
  @Permissions('review.delete')
  deleteCriterion(@Param('id') id: string, @Req() request: FastifyRequest) {
    return this.reviews.deleteCriterion(id, request.admin!.id);
  }

  @Post('reviews')
  @Permissions('review.create')
  create(@Body() dto: CreateReviewDto, @Req() request: FastifyRequest) {
    return this.reviews.createReview(dto, request.admin!.id);
  }

  @Get('reviews')
  @Permissions('review.create')
  list(@Req() request: FastifyRequest) {
    return this.reviews.listReviews(request.admin!.id);
  }

  @Get('reviews/:id')
  @Permissions('review.create')
  get(@Param('id') id: string, @Req() request: FastifyRequest) {
    return this.reviews.getReview(id, request.admin!.id);
  }

  @Patch('reviews/:id')
  @Permissions('review.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
    @Req() request: FastifyRequest,
  ) {
    return this.reviews.updateReview(id, dto, request.admin!.id);
  }

  @Post('reviews/:id/submit')
  @Permissions('review.submit')
  submit(@Param('id') id: string, @Req() request: FastifyRequest) {
    return this.reviews.transition(id, 'IN_REVIEW', request.admin!.id);
  }

  @Post('reviews/:id/publish')
  @Permissions('review.publish')
  publish(@Param('id') id: string, @Req() request: FastifyRequest) {
    return this.reviews.transition(id, 'PUBLISHED', request.admin!.id);
  }

  @Post('reviews/:id/archive')
  @Permissions('review.publish')
  archive(@Param('id') id: string, @Req() request: FastifyRequest) {
    return this.reviews.archive(id, request.admin!.id);
  }
}
