import { ConflictException } from '@nestjs/common';
import { TagsRedirectsService } from './tags-redirects.service.js';

describe('TagsRedirectsService', () => {
  const audit = { log: vi.fn() } as never;
  const access = { assertSiteAccess: vi.fn() } as never;

  it('resolves an active redirect chain to its final path', async () => {
    const redirects = new Map([
      ['/old', { toPath: '/new', statusCode: 301 }],
      ['/new', { toPath: '/current', statusCode: 302 }],
    ]);
    const prisma = {
      redirect: {
        findFirst: vi.fn(
          async ({ where }: { where: { fromPath: string } }) =>
            redirects.get(where.fromPath) ?? null,
        ),
      },
    } as never;
    const service = new TagsRedirectsService(prisma, audit, access);
    await expect(service.resolve('site-1', '/old')).resolves.toEqual({
      toPath: '/current',
      statusCode: 302,
    });
  });

  it('rejects redirect resolution loops', async () => {
    const prisma = {
      redirect: {
        findFirst: vi.fn(
          async ({ where }: { where: { fromPath: string } }) => ({
            toPath: where.fromPath === '/a' ? '/b' : '/a',
            statusCode: 301,
          }),
        ),
      },
    } as never;
    const service = new TagsRedirectsService(prisma, audit, access);
    await expect(service.resolve('site-1', '/a')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
