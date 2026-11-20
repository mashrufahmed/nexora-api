import { AdminManagementService } from './admin-management.service.js';

describe('AdminManagementService session revocation', () => {
  it('increments sessionVersion to invalidate all existing sessions', async () => {
    const update = vi.fn().mockResolvedValue({ id: 'admin-1', sessionVersion: 4 });
    const service = new AdminManagementService({ adminUser: { update } } as never, {} as never);
    await expect(service.revokeAdminSessions('admin-1')).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledWith({ where: { id: 'admin-1' }, data: { sessionVersion: { increment: 1 } } });
  });
});