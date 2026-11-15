/*
  Warnings:

  - A unique constraint covering the columns `[admin_id,role_id]` on the table `admin_roles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[role_id,permission_id]` on the table `role_permissions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "admin_roles_admin_id_role_id_key" ON "admin_roles"("admin_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");
