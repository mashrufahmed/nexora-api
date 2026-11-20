import { BadRequestException, ConflictException } from '@nestjs/common';
import { GuidesService } from './guides.service.js';

describe('GuidesService', () => {
  const auditMock = { log: vi.fn(async () => undefined) };
  const audit = auditMock as never;
  const access = { assertSiteAccess: vi.fn(async () => undefined) } as never;
  const base = () => ({
    buyingGuide: { findUnique: vi.fn(async () => ({ id: 'guide-1', siteId: 'site-1', status: 'DRAFT' })), update: vi.fn(async () => ({ id: 'guide-1' })), delete: vi.fn(async () => undefined) },
    comparison: { findUnique: vi.fn(async () => ({ id: 'comparison-1', siteId: 'site-1', status: 'DRAFT' })), update: vi.fn(async () => ({ id: 'comparison-1' })), delete: vi.fn(async () => undefined) },
    siteProduct: { count: vi.fn(async () => 2) },
    $transaction: vi.fn(async (callback: (tx: any) => unknown) => callback({ buyingGuideItem: { deleteMany: vi.fn(), createMany: vi.fn(async () => ({ count: 2 })) }, comparisonItem: { deleteMany: vi.fn(), createMany: vi.fn(async () => ({ count: 2 })) } })),
  });

  it('rejects duplicate positions and products', async () => {
    const service = new GuidesService(base() as never, audit, access);
    await expect(service.addItems('guide-1', { items: [{ siteProductId: 'p1', position: 0 }, { siteProductId: 'p2', position: 0 }] }, 'admin-1')).rejects.toBeInstanceOf(ConflictException);
    await expect(service.addItems('guide-1', { items: [{ siteProductId: 'p1', position: 0 }, { siteProductId: 'p1', position: 1 }] }, 'admin-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects edits and item changes after publishing', async () => {
    const prisma = base(); prisma.buyingGuide.findUnique.mockResolvedValue({ id: 'guide-1', siteId: 'site-1', status: 'PUBLISHED' });
    const service = new GuidesService(prisma as never, audit, access);
    await expect(service.update('guide-1', { siteId: 'site-1', title: 'Updated', slug: 'updated' }, 'admin-1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.addItems('guide-1', { items: [{ siteProductId: 'p1', position: 0 }] }, 'admin-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('validates availability and writes audit events', async () => {
    const prisma = base(); prisma.siteProduct.count.mockResolvedValue(1);
    const service = new GuidesService(prisma as never, audit, access);
    await expect(service.addItems('guide-1', { items: [{ siteProductId: 'p1', position: 0 }, { siteProductId: 'p2', position: 1 }] }, 'admin-1')).rejects.toBeInstanceOf(BadRequestException);
    prisma.siteProduct.count.mockResolvedValue(2);
    await service.addItems('guide-1', { items: [{ siteProductId: 'p1', position: 0 }, { siteProductId: 'p2', position: 1 }] }, 'admin-1');
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'guide.items_updated', entityId: 'guide-1' }));
  });
});