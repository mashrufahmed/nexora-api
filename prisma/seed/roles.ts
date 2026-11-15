export const SYSTEM_ROLES = [
  {
    name: 'Super Admin',
    description: 'Full system access',
    permissions: '*',
  },
  {
    name: 'Admin',
    description: 'Administrative access',
    permissions: [
      'rbac.admins.read',
      'rbac.admins.create',
      'rbac.admins.update',
      'rbac.admins.assign_roles',
      'rbac.roles.read',
      'rbac.permissions.read',
      'articles.read',
      'articles.create',
      'articles.update',
      'articles.delete',
      'articles.publish',
    ],
  },
  {
    name: 'Editor',
    description: 'Content editing and publishing',
    permissions: [
      'articles.read',
      'articles.create',
      'articles.update',
      'articles.publish',
    ],
  },
  {
    name: 'Author',
    description: 'Article creation access',
    permissions: ['articles.read', 'articles.create'],
  },
] as const;
