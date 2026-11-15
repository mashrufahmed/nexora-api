import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service.js';

interface CreateAuditLogInput {
  actorAdminId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: CreateAuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        actorAdminId: input.actorAdminId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata
          ? JSON.parse(JSON.stringify(input.metadata))
          : undefined,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    actorAdminId?: string;
    action?: string;
    entityType?: string;
  }) {
    const { page, limit, actorAdminId, action, entityType } = params;

    const where = {
      ...(actorAdminId ? { actorAdminId } : {}),
      ...(action ? { action } : {}),
      ...(entityType ? { entityType } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}
