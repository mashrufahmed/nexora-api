export const PERMISSIONS = [
  // Admin Management
  {
    name: 'Read Admins',
    code: 'rbac.admins.read',
    module: 'rbac.admins',
  },
  {
    name: 'Create Admins',
    code: 'rbac.admins.create',
    module: 'rbac.admins',
  },
  {
    name: 'Update Admins',
    code: 'rbac.admins.update',
    module: 'rbac.admins',
  },
  {
    name: 'Delete Admins',
    code: 'rbac.admins.delete',
    module: 'rbac.admins',
  },
  {
    name: 'Assign Admin Roles',
    code: 'rbac.admins.assign_roles',
    module: 'rbac.admins',
  },
  // Role Management
  {
    name: 'Read Roles',
    code: 'rbac.roles.read',
    module: 'rbac.roles',
  },
  {
    name: 'Create Roles',
    code: 'rbac.roles.create',
    module: 'rbac.roles',
  },
  {
    name: 'Update Roles',
    code: 'rbac.roles.update',
    module: 'rbac.roles',
  },
  {
    name: 'Delete Roles',
    code: 'rbac.roles.delete',
    module: 'rbac.roles',
  },
  {
    name: 'Assign Role Permissions',
    code: 'rbac.roles.assign_permissions',
    module: 'rbac.roles',
  },

  // Permission Management
  {
    name: 'Read Permissions',
    code: 'rbac.permissions.read',
    module: 'rbac.permissions',
  },
  {
    name: 'Create Permissions',
    code: 'rbac.permissions.create',
    module: 'rbac.permissions',
  },
  {
    name: 'Update Permissions',
    code: 'rbac.permissions.update',
    module: 'rbac.permissions',
  },
  {
    name: 'Delete Permissions',
    code: 'rbac.permissions.delete',
    module: 'rbac.permissions',
  },
  // Content Management
  {
    name: 'Read Articles',
    code: 'articles.read',
    module: 'articles',
  },
  {
    name: 'Create Articles',
    code: 'articles.create',
    module: 'articles',
  },
  {
    name: 'Update Articles',
    code: 'articles.update',
    module: 'articles',
  },
  {
    name: 'Delete Articles',
    code: 'articles.delete',
    module: 'articles',
  },
  {
    name: 'Publish Articles',
    code: 'articles.publish',
    module: 'articles',
  },
  {
    name: 'Read Admins',
    code: 'rbac.admins.read',
    module: 'rbac.admins',
  },
  {
    name: 'Update Admins',
    code: 'rbac.admins.update',
    module: 'rbac.admins',
  },
  {
    name: 'Assign Admin Roles',
    code: 'rbac.admins.assign_roles',
    module: 'rbac.admins',
  },
  {
    name: 'Read Audit Logs',
    code: 'audit.logs.read',
    module: 'audit',
    description: 'View administrative audit logs',
  },
] as const;
