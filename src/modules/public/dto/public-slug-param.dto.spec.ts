import { validate } from 'class-validator';
import { PublicSlugParamDto } from './public-slug-param.dto.js';

describe('PublicSlugParamDto', () => {
  it('accepts URL-safe slugs', async () => {
    const errors = await validate(Object.assign(new PublicSlugParamDto(), { slug: 'best-product-2026' }));
    expect(errors).toHaveLength(0);
  });

  it('rejects malformed slugs', async () => {
    const errors = await validate(Object.assign(new PublicSlugParamDto(), { slug: '../internal-id' }));
    expect(errors.map((error) => error.property)).toContain('slug');
  });
});