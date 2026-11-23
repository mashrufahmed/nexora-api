import { AUDIT_ACTIONS } from './audit.constants.js';

describe('AUDIT_ACTIONS', () => {
  it('contains current content and site workflow actions only', () => {
    expect(AUDIT_ACTIONS).toMatchObject({
      CONTENT_CREATED: 'content.created',
      CONTENT_UPDATED: 'content.updated',
      CONTENT_DELETED: 'content.deleted',
      CONTENT_STATUS_CHANGED: 'content.status_changed',
      CONTENT_PUBLISHED: 'content.published',
      CONTENT_PUBLISHED_SCHEDULED: 'content.published_scheduled',
      CATEGORY_CREATED: 'category.created',
      SITE_CREATED: 'site.created',
      SITE_UPDATED: 'site.updated',
      SITE_DELETED: 'site.deleted',
      SITE_DOMAIN_CREATED: 'site.domain.created',
      SITE_SECRET_CREATED: 'site.secret.created',
      SITE_SECRET_REVOKED: 'site.secret.revoked',
    });

    expect(
      Object.values(AUDIT_ACTIONS).some((action) =>
        action.includes('template'),
      ),
    ).toBe(false);
  });
});
