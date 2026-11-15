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
} as const;
