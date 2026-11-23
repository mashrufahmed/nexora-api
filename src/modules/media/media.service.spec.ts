import { BadRequestException } from '@nestjs/common';
import { MediaService } from './media.service.js';
import { MAX_BASE64_LENGTH, MAX_MEDIA_BYTES } from './media.constants.js';

describe('MediaService upload limits', () => {
  const service = (prisma: unknown) => new MediaService(
    prisma as never,
    { log: vi.fn() } as never,
    { put: vi.fn(), delete: vi.fn(), url: vi.fn(), signedUrl: vi.fn() } as never,
    { assertSiteAccess: vi.fn(async () => undefined) } as never,
    { add: vi.fn() } as never,
    { add: vi.fn() } as never,
  );

  it('rejects an encoded payload before decoding when it exceeds the limit', async () => {
    const data = 'A'.repeat(MAX_BASE64_LENGTH + 4);
    const instance = service({});
    await expect(instance.upload({ originalFilename: 'x.png', mimeType: 'image/png', data }, 'admin-1'))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses the 10 MB binary limit constant', () => {
    expect(MAX_MEDIA_BYTES).toBe(10 * 1024 * 1024);
  });

  it('rejects malformed base64 instead of silently decoding it', async () => {
    const instance = service({});
    await expect(instance.upload({ originalFilename: 'x.png', mimeType: 'image/png', data: 'iVBORw0KGgo$' }, 'admin-1'))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});