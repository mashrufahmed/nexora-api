import { BadRequestException } from '@nestjs/common';
import { SitesService } from './sites.service.js';

function createService() {
  const prisma = {
    mediaAsset: { findMany: vi.fn() },
    siteDomain: { findMany: vi.fn() },
  };
  const redis = { getClient: vi.fn() };
  return new SitesService(
    prisma as never,
    {} as never,
    redis as never,
    {} as never,
  );
}

describe('SitesService site settings', () => {
  it('accepts the documented SEO defaults', () => {
    const service = createService() as any;
    expect(
      service.validateSeo({ titleTemplate: '%s | Nexora', noIndex: false }),
    ).toEqual({
      titleTemplate: '%s | Nexora',
      noIndex: false,
    });
  });

  it('rejects SEO templates without the %s placeholder', () => {
    const service = createService() as any;
    expect(() => service.validateSeo({ titleTemplate: 'Nexora' })).toThrow(
      BadRequestException,
    );
  });

  it('rejects unknown and invalid site settings', () => {
    const service = createService() as any;
    expect(() => service.validateSettings({ unknown: true })).toThrow(
      BadRequestException,
    );
    expect(() => service.validateSettings({ timeZone: 'Not/AZone' })).toThrow(
      BadRequestException,
    );
    expect(() =>
      service.validateSettings({ social: { x: 'http://example.com' } }),
    ).toThrow(BadRequestException);
  });
});
