import { ForbiddenException } from '@nestjs/common';
import { CmsService } from './cms.service.js';

function service(content: Record<string, unknown>) {
  const prisma = {
    content: {
      findUnique: vi.fn().mockResolvedValue(content),
      update: vi.fn().mockResolvedValue({ id: 'content-1' }),
    },
  };
  const audit = { log: vi.fn().mockResolvedValue(undefined) };
  const siteAccess = {
    assertSiteAccess: vi.fn().mockResolvedValue(undefined),
  };
  return {
    instance: new CmsService(
      prisma as never,
      audit as never,
      siteAccess as never,
    ),
    prisma,
  };
}

describe('CmsService content ownership', () => {
  const dto = { title: 'Updated title' };

  it('allows an Author to update their own draft', async () => {
    const ctx = service({
      createdById: 'author-1',
      status: 'DRAFT',
      siteContents: [],
    });

    await expect(
      ctx.instance.updateContent('content-1', dto, 'author-1', [
        'content.update',
      ]),
    ).resolves.toEqual({ id: 'content-1' });
    expect(ctx.prisma.content.update).toHaveBeenCalled();
  });

  it("rejects an Author updating another admin's draft", async () => {
    const ctx = service({
      createdById: 'author-2',
      status: 'DRAFT',
      siteContents: [],
    });

    await expect(
      ctx.instance.updateContent('content-1', dto, 'author-1', [
        'content.update',
      ]),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(ctx.prisma.content.update).not.toHaveBeenCalled();
  });

  it('rejects an Author updating published content, even when they created it', async () => {
    const ctx = service({
      createdById: 'author-1',
      status: 'PUBLISHED',
      siteContents: [],
    });

    await expect(
      ctx.instance.updateContent('content-1', dto, 'author-1', [
        'content.update',
      ]),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows Editors with content.update.any to update any content', async () => {
    const ctx = service({
      createdById: 'author-2',
      status: 'PUBLISHED',
      siteContents: [],
    });

    await expect(
      ctx.instance.updateContent('content-1', dto, 'editor-1', [
        'content.update',
        'content.update.any',
      ]),
    ).resolves.toEqual({ id: 'content-1' });
  });
});
