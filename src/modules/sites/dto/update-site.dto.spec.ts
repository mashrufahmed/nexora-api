import { validate } from 'class-validator';
import { UpdateSiteDto } from './update-site.dto.js';

describe('UpdateSiteDto', () => {
  it('does not expose a mutable slug field', () => {
    expect('slug' in new UpdateSiteDto()).toBe(false);
  });

  it('continues to validate supported site updates', async () => {
    const dto = Object.assign(new UpdateSiteDto(), { name: 'Updated site' });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
