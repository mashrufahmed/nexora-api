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
  {
    name: 'Manage Sites',
    code: 'site.manage',
    module: 'sites',
  },
  {
    name: 'Create Sites',
    code: 'site.create',
    module: 'sites',
  },
  {
    name: 'Update Sites',
    code: 'site.update',
    module: 'sites',
  },
  {
    name: 'Delete Sites',
    code: 'site.delete',
    module: 'sites',
  },
  { name: 'Create Content', code: 'content.create', module: 'content' },
  { name: 'Update Content', code: 'content.update', module: 'content' },
  { name: 'Submit Content', code: 'content.submit', module: 'content' },
  { name: 'Publish Content', code: 'content.publish', module: 'content' },
  { name: 'Archive Content', code: 'content.archive', module: 'content' },
  { name: 'Manage Categories', code: 'category.manage', module: 'content' },
  { name: 'Create Products', code: 'product.create', module: 'products' },
  { name: 'Update Products', code: 'product.update', module: 'products' },
  { name: 'Delete Products', code: 'product.delete', module: 'products' },
  { name: 'Publish Products', code: 'product.publish', module: 'products' },
  { name: 'Create Reviews', code: 'review.create', module: 'reviews' },
  { name: 'Update Reviews', code: 'review.update', module: 'reviews' },
  { name: 'Submit Reviews', code: 'review.submit', module: 'reviews' },
  { name: 'Publish Reviews', code: 'review.publish', module: 'reviews' },
  { name: 'Upload Media', code: 'media.upload', module: 'media' },
  { name: 'Delete Media', code: 'media.delete', module: 'media' },
  { name: 'Manage Authors', code: 'author.manage', module: 'authors' },
  { name: 'Edit Pages', code: 'page.edit', module: 'page-builder' },
  { name: 'Publish Pages', code: 'page.publish', module: 'page-builder' },
  { name: 'Manage Affiliates', code: 'affiliate.manage', module: 'affiliate' },
  { name: 'Manage Guides', code: 'guide.manage', module: 'guides' },
  { name: 'Manage Comparisons', code: 'comparison.manage', module: 'comparisons' },
  { name: 'Send Email', code: 'email.send', module: 'email' },
  { name: 'Manage Email', code: 'email.manage', module: 'email' },
  { name: 'Manage Newsletter', code: 'newsletter.manage', module: 'newsletter' },
  { name: 'Manage Tags', code: 'tag.manage', module: 'content' },
  { name: 'Manage Redirects', code: 'redirect.manage', module: 'content' },
  { name: 'Read Analytics', code: 'analytics.read', module: 'analytics' },
] as const;
