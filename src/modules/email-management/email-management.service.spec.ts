import { BadRequestException } from '@nestjs/common';
import { EmailManagementService } from './email-management.service.js';

describe('EmailManagementService', () => {
  const auditMock = { log: vi.fn(async () => undefined) };
  const access = { assertSiteAccess: vi.fn(async () => undefined) } as never;
  const base = () => ({
    emailSender: { findFirst: vi.fn(async () => ({ id: 'sender-1', status: 'ACTIVE' })) },
    emailTemplate: { findFirst: vi.fn(async () => ({ id: 'template-1', status: 'ACTIVE', subject: 'Hello {{name}}', htmlBody: '<p>{{name}}</p>', variables: ['name'] })) },
    emailMessage: { create: vi.fn(async ({ data }: { data: any }) => ({ id: 'message-1', ...data, status: 'QUEUED' })), findUnique: vi.fn(), update: vi.fn(async ({ data }: { data: any }) => data) },
  });

  it('rejects missing declared template variables before queueing', async () => {
    const prisma = base(); const queue = { add: vi.fn() };
    const service = new EmailManagementService(prisma as never, {} as never, auditMock as never, access, queue as never);
    await expect(service.send({ siteId: 'site-1', recipient: 'user@example.com', subject: 'ignored', htmlBody: 'ignored', templateId: 'template-1', variables: {} }, 'admin-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('creates a queued message with rendered template content', async () => {
    const prisma = base(); const queue = { add: vi.fn(async () => undefined) };
    const service = new EmailManagementService(prisma as never, {} as never, auditMock as never, access, queue as never);
    await expect(service.send({ siteId: 'site-1', recipient: 'user@example.com', subject: 'ignored', htmlBody: 'ignored', templateId: 'template-1', variables: { name: 'Ada' } }, 'admin-1')).resolves.toMatchObject({ id: 'message-1', subject: 'Hello Ada', htmlBody: '<p>Ada</p>' });
    expect(queue.add).toHaveBeenCalledWith('send', { emailMessageId: 'message-1' }, expect.objectContaining({ attempts: 3 }));
  });
});