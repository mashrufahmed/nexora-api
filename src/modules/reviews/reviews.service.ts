import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../database/generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { SiteAccessService } from '../site-access/site-access.service.js';
import { CreateCriterionDto } from './dto/create-criterion.dto.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly siteAccess: SiteAccessService,
  ) {}

  private jsonValue(
    value: Record<string, unknown> | undefined,
  ): Prisma.InputJsonValue | undefined {
    return value === undefined
      ? undefined
      : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
  }

  private assertSiteAccess(adminId: string, siteId: string) { return this.siteAccess.assertSiteAccess(adminId, siteId); }

  async createCriterion(
    siteId: string,
    dto: CreateCriterionDto,
    adminId: string,
  ) {
    await this.assertSiteAccess(adminId, siteId);
    try {
      const criterion = await this.prisma.reviewScoreCriterion.create({
        data: {
          siteId,
          name: dto.name.trim(),
          description: dto.description?.trim(),
          weight: dto.weight,
          position: dto.position ?? 0,
        },
      });
      await this.audit.log({ actorAdminId: adminId, action: 'review.criterion.created', entityType: 'review_criterion', entityId: criterion.id });
      return criterion;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'Criterion name already exists for this site',
        );
      throw error;
    }
  }

  async listCriteria(siteId: string, adminId: string) {
    await this.assertSiteAccess(adminId, siteId);
    return this.prisma.reviewScoreCriterion.findMany({
      where: { siteId },
      orderBy: { position: 'asc' },
    });
  }

  async updateCriterion(id: string, dto: CreateCriterionDto, adminId: string) {
    const criterion = await this.prisma.reviewScoreCriterion.findUnique({
      where: { id },
      select: { id: true, siteId: true },
    });
    if (!criterion) throw new NotFoundException('Review criterion not found');
    await this.assertSiteAccess(adminId, criterion.siteId);
    try {
      const updated = await this.prisma.reviewScoreCriterion.update({
        where: { id },
        data: {
          name: dto.name.trim(),
          description: dto.description?.trim(),
          weight: dto.weight,
          position: dto.position ?? 0,
        },
      });
      await this.audit.log({ actorAdminId: adminId, action: 'review.criterion.updated', entityType: 'review_criterion', entityId: id });
      return updated;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'Criterion name already exists for this site',
        );
      throw error;
    }
  }

  async deleteCriterion(id: string, adminId: string) {
    const criterion = await this.prisma.reviewScoreCriterion.findUnique({
      where: { id },
      select: { id: true, siteId: true },
    });
    if (!criterion) throw new NotFoundException('Review criterion not found');
    await this.assertSiteAccess(adminId, criterion.siteId);
    const scoreCount = await this.prisma.reviewCriterionScore.count({
      where: { criterionId: id },
    });
    if (scoreCount > 0)
      throw new BadRequestException(
        'Cannot delete a criterion used by reviews',
      );
    await this.prisma.reviewScoreCriterion.delete({ where: { id } });
    await this.audit.log({ actorAdminId: adminId, action: 'review.criterion.deleted', entityType: 'review_criterion', entityId: id });
    return { message: 'Review criterion deleted successfully' };
  }

  private async scoreReview(
    scores: CreateReviewDto['scores'],
    siteProductId: string,
  ) {
    const product = await this.prisma.siteProduct.findUnique({
      where: { id: siteProductId },
      select: { id: true, siteId: true },
    });
    if (!product) throw new NotFoundException('Site product not found');
    const uniqueIds = [...new Set(scores.map((score) => score.criterionId))];
    if (uniqueIds.length !== scores.length)
      throw new BadRequestException(
        'Each review criterion may be scored only once',
      );
    const criteria = await this.prisma.reviewScoreCriterion.findMany({
      where: {
        id: { in: uniqueIds },
        siteId: product.siteId,
        status: 'ACTIVE',
      },
      select: { id: true, weight: true },
    });
    if (criteria.length !== scores.length)
      throw new BadRequestException(
        'All criteria must belong to the product site and be active',
      );
    const criterionMap = new Map(
      criteria.map((criterion) => [criterion.id, criterion]),
    );
    let weightedTotal = 0;
    let weightTotal = 0;
    for (const score of scores) {
      if (score.score < 0 || score.score > 10)
        throw new BadRequestException('Review scores must be between 0 and 10');
      const criterion = criterionMap.get(score.criterionId)!;
      const weight = Number(criterion.weight);
      weightedTotal += score.score * weight;
      weightTotal += weight;
    }
    if (weightTotal <= 0)
      throw new BadRequestException(
        'At least one positive criterion weight is required',
      );
    return { product, criteria, overallScore: weightedTotal / weightTotal };
  }

  async createReview(dto: CreateReviewDto, adminId: string) {
    const calculated = await this.scoreReview(dto.scores, dto.siteProductId);
    await this.assertSiteAccess(adminId, calculated.product.siteId);
    const review = await this.prisma.$transaction(async (tx) =>
      tx.review.create({
        data: {
          siteProductId: dto.siteProductId,
          authorId: adminId,
          title: dto.title.trim(),
          verdict: dto.verdict?.trim(),
          body: this.jsonValue(dto.body),
          overallScore: calculated.overallScore,
          scores: {
            create: dto.scores.map((score) => ({
              criterionId: score.criterionId,
              score: score.score,
              notes: score.notes?.trim(),
            })),
          },
        },
        include: { scores: true },
      }),
    );
    await this.audit.log({
      actorAdminId: adminId,
      action: 'review.created',
      entityType: 'review',
      entityId: review.id,
    });
    return review;
  }

  async listReviews(adminId: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { roles: { select: { role: { select: { name: true } } } } },
    });
    const isSuper = admin?.roles.some(
      ({ role }) => role.name === 'Super Admin',
    );
    return this.prisma.review.findMany({
      where: isSuper
        ? undefined
        : {
            siteProduct: {
              site: { userAccess: { some: { userId: adminId } } },
            },
          },
      include: { scores: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReview(id: string, adminId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        scores: { include: { criterion: true } },
        siteProduct: { include: { product: true, site: true } },
      },
    });
    if (!review) throw new NotFoundException('Review not found');
    await this.assertSiteAccess(adminId, review.siteProduct.siteId);
    return review;
  }

  async updateReview(id: string, dto: UpdateReviewDto, adminId: string) {
    const existing = await this.prisma.review.findUnique({
      where: { id },
      select: {
        id: true,
        siteProductId: true,
        siteProduct: { select: { siteId: true } },
      },
    });
    if (!existing) throw new NotFoundException('Review not found');
    await this.assertSiteAccess(adminId, existing.siteProduct.siteId);
    let scoreData:
      { overallScore: number; scores: CreateReviewDto['scores'] } | undefined;
    if (dto.scores) {
      const calculated = await this.scoreReview(
        dto.scores,
        existing.siteProductId,
      );
      scoreData = { overallScore: calculated.overallScore, scores: dto.scores };
    }
    const review = await this.prisma.$transaction(async (tx) => {
      if (scoreData)
        await tx.reviewCriterionScore.deleteMany({ where: { reviewId: id } });
      return tx.review.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title.trim() }),
          ...(dto.verdict !== undefined && { verdict: dto.verdict.trim() }),
          ...(dto.body !== undefined && { body: this.jsonValue(dto.body) }),
          ...(scoreData && {
            overallScore: scoreData.overallScore,
            scores: {
              create: scoreData.scores.map((score) => ({
                criterionId: score.criterionId,
                score: score.score,
                notes: score.notes?.trim(),
              })),
            },
          }),
        },
        include: { scores: true },
      });
    });
    await this.audit.log({
      actorAdminId: adminId,
      action: 'review.updated',
      entityType: 'review',
      entityId: id,
    });
    return review;
  }

  async transition(
    id: string,
    status: 'IN_REVIEW' | 'PUBLISHED',
    adminId: string,
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        siteProduct: { select: { siteId: true } },
      },
    });
    if (!review) throw new NotFoundException('Review not found');
    await this.assertSiteAccess(adminId, review.siteProduct.siteId);
    if (
      (status === 'IN_REVIEW' && review.status !== 'DRAFT') ||
      (status === 'PUBLISHED' && review.status !== 'IN_REVIEW')
    )
      throw new BadRequestException(
        `Invalid review transition: ${review.status} -> ${status}`,
      );
    const updated = await this.prisma.review.update({
      where: { id },
      data: {
        status,
        ...(status === 'PUBLISHED' && { publishedAt: new Date() }),
      },
    });
    await this.audit.log({
      actorAdminId: adminId,
      action: `review.${status.toLowerCase()}`,
      entityType: 'review',
      entityId: id,
    });
    return updated;
  }

  async archive(id: string, adminId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        siteProduct: { select: { siteId: true } },
      },
    });
    if (!review) throw new NotFoundException('Review not found');
    await this.assertSiteAccess(adminId, review.siteProduct.siteId);
    if (review.status !== 'PUBLISHED')
      throw new BadRequestException('Only published reviews can be archived');
    const archived = await this.prisma.review.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    await this.audit.log({ actorAdminId: adminId, action: 'review.archived', entityType: 'review', entityId: id });
    return archived;
  }
}
