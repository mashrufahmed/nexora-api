import { validate } from 'class-validator';
import { PublicListQueryDto } from './public-list-query.dto.js';

describe('PublicListQueryDto', () => {
  it('defaults to a bounded page size', () => {
    const query = new PublicListQueryDto();
    expect(query.page).toBe(1);
    expect(query.limit).toBe(20);
  });

  it('rejects invalid and unbounded pagination values', async () => {
    const query = Object.assign(new PublicListQueryDto(), { page: 0, limit: 51 });
    const errors = await validate(query);
    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(['page', 'limit']));
  });
});