import { PublicService } from './public.service.js';

describe('PublicService response safety', () => {
  it('maps public author fields without private email or relation ids', async () => {
    const prisma = {
      author: {
        findMany: vi.fn().mockResolvedValue([{ name: 'Ada', slug: 'ada', bio: null, shortBio: null, designation: null, website: null, socialLinks: null, contentLinks: [] }]),
        count: vi.fn().mockResolvedValue(1),
      },
    };
    const service = new PublicService(prisma as never, { resolveHostname: vi.fn().mockResolvedValue({ id: 'site-1' }) } as never);
    const result = await service.authors('example.com');
    expect(result).not.toHaveProperty('items.0.email');
    expect(result).not.toHaveProperty('items.0.id');
  });
});