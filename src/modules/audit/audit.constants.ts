export const AUDIT_ACTIONS = {
  ADMIN_CREATED: 'admin.created',
  ADMIN_ACTIVATED: 'admin.activated',
  ADMIN_UPDATED: 'admin.updated',
  ADMIN_STATUS_CHANGED: 'admin.status_changed',

  ROLE_CREATED: 'role.created',
  ROLE_UPDATED: 'role.updated',
  ROLE_DELETED: 'role.deleted',
  ROLE_ASSIGNED: 'role.assigned',
  ROLE_REMOVED: 'role.removed',

  PERMISSION_CREATED: 'permission.created',
  PERMISSION_UPDATED: 'permission.updated',
  PERMISSION_DELETED: 'permission.deleted',
  PERMISSION_ASSIGNED: 'permission.assigned',
  PERMISSION_REMOVED: 'permission.removed',

  ADMIN_LOGIN_SUCCESS: 'admin.login.success',
  ADMIN_LOGIN_FAILED: 'admin.login.failed',
  ADMIN_LOGOUT: 'admin.logout',

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
} as const;
